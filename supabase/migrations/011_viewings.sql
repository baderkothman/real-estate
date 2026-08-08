-- Milestone 5: viewing appointments as a real lifecycle, not a boolean.
-- Selecting a slot never implies confirmation — a viewing starts
-- 'requested' and only the host (the listing's owner) can move it to
-- 'confirmed'. See services/viewing.service.ts / app/actions/viewings.ts.

create type viewing_status as enum (
  'requested', 'confirmed', 'completed', 'cancelled', 'no_show'
);

create table public.viewings (
  id                  uuid primary key default uuid_generate_v4(),
  listing_id          uuid not null references public.listings(id) on delete cascade,
  requested_by        uuid not null references public.profiles(id) on delete cascade,
  host_id             uuid not null references public.profiles(id) on delete cascade,
  status              viewing_status not null default 'requested',
  -- array of {start, end} ISO-8601 strings proposed by the requester (or, on
  -- a reschedule, by whichever party proposed the new time).
  requested_slots     jsonb not null default '[]',
  confirmed_start     timestamptz,
  confirmed_end       timestamptz,
  location_note       text,
  cancellation_reason text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_viewings_listing_id   on public.viewings(listing_id);
create index idx_viewings_requested_by on public.viewings(requested_by);
create index idx_viewings_host_id      on public.viewings(host_id);
create index idx_viewings_status       on public.viewings(status);

create trigger trg_viewings_set_updated_at
  before update on public.viewings
  for each row execute procedure public.set_updated_at();

alter table public.viewings enable row level security;

create policy "viewings_select"
  on public.viewings for select
  using (requested_by = auth.uid() or host_id = auth.uid() or public.is_admin());

create policy "viewings_insert"
  on public.viewings for insert
  with check (
    auth.uid() = requested_by
    and auth.uid() <> host_id
    and host_id = (select listed_by from public.listings where id = listing_id)
  );

create policy "viewings_update"
  on public.viewings for update
  using (requested_by = auth.uid() or host_id = auth.uid() or public.is_admin());

-- ─── Transition graph ────────────────────────────────────────────────────────
-- requested -> confirmed   (host)
-- requested -> cancelled   (either participant)
-- confirmed -> requested   (either participant proposes a reschedule)
-- confirmed -> cancelled   (either participant)
-- confirmed -> completed   (host)
-- confirmed -> no_show     (host)
create or replace function public.is_valid_viewing_transition(
  p_old viewing_status, p_new viewing_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('requested', 'confirmed'),
    ('requested', 'cancelled'),
    ('confirmed', 'requested'),
    ('confirmed', 'cancelled'),
    ('confirmed', 'completed'),
    ('confirmed', 'no_show')
  );
$$;

create or replace function public.enforce_viewing_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.listing_id is distinct from old.listing_id
    or new.requested_by is distinct from old.requested_by
    or new.host_id is distinct from old.host_id
  then
    raise exception 'listing_id, requested_by, and host_id cannot be changed after a viewing is created'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not public.is_valid_viewing_transition(old.status, new.status) then
      raise exception 'Invalid viewing status transition: % -> %', old.status, new.status
        using errcode = '22023';
    end if;

    if new.status = 'confirmed' and not (old.host_id = auth.uid() or public.is_admin()) then
      raise exception 'Only the host may confirm a viewing' using errcode = '42501';
    end if;

    if new.status in ('completed', 'no_show') and not (old.host_id = auth.uid() or public.is_admin()) then
      raise exception 'Only the host may mark a viewing completed or a no-show' using errcode = '42501';
    end if;

    if new.status = 'cancelled'
      and not (old.host_id = auth.uid() or old.requested_by = auth.uid() or public.is_admin())
    then
      raise exception 'Only a participant may cancel a viewing' using errcode = '42501';
    end if;

    if new.status = 'requested' and old.status = 'confirmed'
      and not (old.host_id = auth.uid() or old.requested_by = auth.uid() or public.is_admin())
    then
      raise exception 'Only a participant may propose a reschedule' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_viewings_transition
  before update on public.viewings
  for each row execute procedure public.enforce_viewing_transition();
