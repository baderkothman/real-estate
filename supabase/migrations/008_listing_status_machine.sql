-- Milestone 2: replaces the blunt "non-admins can never touch these
-- columns" guard from migration 005 with real state-machine validation:
--   - `moderation_status` transitions are now authorized per-transition, not
--     per-column. In particular, an owner resubmitting an edited listing
--     (approved/rejected -> pending) must remain possible — the migration
--     005 guard actually broke this existing business rule (any non-admin
--     edit is supposed to reset status to 'pending' for re-review), since it
--     blocked ANY non-admin change to moderation_status unconditionally.
--     This was never applied to a live database, so no live-data fix is
--     needed — only the trigger logic itself.
--   - `lifecycle_status` transitions are now validated against an explicit
--     graph for every actor (including admins) so the state machine can't
--     drift into nonsensical states as later milestones add more of it
--     (under_offer/under_contract/withdrawn/expired/archived). Only
--     available <-> sold/leased is reachable by app code today (the
--     existing "toggle sold" feature); the rest of the graph is schema-ready
--     for Milestones 5-9.
-- Also adds `listing_history`, a narrow trigger-populated log of
-- moderation_status/price changes (kept separate from `audit_log`, which
-- records admin actions specifically — see the audit.service.ts wiring in
-- app/actions/properties.ts).

-- ─── Lifecycle transition graph ─────────────────────────────────────────────
create or replace function public.is_valid_lifecycle_transition(
  p_old listing_lifecycle_status, p_new listing_lifecycle_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('available', 'under_offer'),
    ('available', 'withdrawn'),
    ('available', 'sold'),
    ('available', 'leased'),
    ('available', 'expired'),
    ('under_offer', 'available'),
    ('under_offer', 'under_contract'),
    ('under_contract', 'available'),
    ('under_contract', 'sold'),
    ('under_contract', 'leased'),
    ('sold', 'available'),
    ('leased', 'available'),
    ('withdrawn', 'available'),
    ('expired', 'available'),
    ('available', 'archived'),
    ('withdrawn', 'archived'),
    ('expired', 'archived'),
    ('sold', 'archived'),
    ('leased', 'archived')
  );
$$;

-- ─── Guard trigger, extended with transition validation ────────────────────
create or replace function public.enforce_listings_privilege_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then
      if new.moderation_status is distinct from 'pending'::public.listing_moderation_status
        or new.is_featured is distinct from false
        or new.featured_until is not null
        or new.rejection_reason is not null
      then
        raise exception 'New listings must start pending, unfeatured, with no rejection reason unless created by an admin'
          using errcode = '42501';
      end if;
    end if;
    if new.lifecycle_status is distinct from 'available'::public.listing_lifecycle_status then
      raise exception 'New listings must start with lifecycle_status = available'
        using errcode = '22023';
    end if;
    return new;
  end if;

  -- moderation_status: admins may move freely among pending/approved/
  -- rejected; the owner may only resubmit (approved/rejected -> pending),
  -- matching the existing "editing an approved listing sends it back for
  -- re-review" business rule. Anyone else attempting this update was
  -- already excluded by the listings_update RLS policy before reaching here.
  if new.moderation_status is distinct from old.moderation_status then
    if public.is_admin() then
      null;
    elsif old.listed_by = auth.uid()
      and old.moderation_status in ('approved', 'rejected')
      and new.moderation_status = 'pending'
    then
      null;
    else
      raise exception 'Not authorized to change moderation_status from % to %', old.moderation_status, new.moderation_status
        using errcode = '42501';
    end if;
  end if;

  -- lifecycle_status: validated for every actor, regardless of admin status.
  if new.lifecycle_status is distinct from old.lifecycle_status
    and not public.is_valid_lifecycle_transition(old.lifecycle_status, new.lifecycle_status)
  then
    raise exception 'Invalid lifecycle_status transition: % -> %', old.lifecycle_status, new.lifecycle_status
      using errcode = '22023';
  end if;

  -- Featuring, rejection reason, and ownership transfer remain admin-only,
  -- unchanged from migration 005.
  if not public.is_admin() then
    if new.is_featured is distinct from old.is_featured
      or new.featured_until is distinct from old.featured_until
      or new.listed_by is distinct from old.listed_by
      or new.rejection_reason is distinct from old.rejection_reason
    then
      raise exception 'Only admins may change is_featured, featured_until, listed_by, or rejection_reason on listings'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- ─── listing_history ─────────────────────────────────────────────────────────
create table public.listing_history (
  id          bigserial primary key,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  changed_at  timestamptz not null default now(),
  field       text not null check (field in ('moderation_status', 'price')),
  old_value   text,
  new_value   text,
  actor_id    uuid references public.profiles(id)
);

create index idx_listing_history_listing_id on public.listing_history(listing_id, changed_at desc);

alter table public.listing_history enable row level security;

create policy "listing_history_select"
  on public.listing_history for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_history.listing_id and l.listed_by = auth.uid()
    )
  );

create or replace function public.log_listing_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.moderation_status is distinct from old.moderation_status then
    insert into public.listing_history (listing_id, field, old_value, new_value, actor_id)
    values (new.id, 'moderation_status', old.moderation_status::text, new.moderation_status::text, auth.uid());
  end if;
  if new.price is distinct from old.price then
    insert into public.listing_history (listing_id, field, old_value, new_value, actor_id)
    values (new.id, 'price', old.price::text, new.price::text, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_listings_log_history
  after update on public.listings
  for each row execute procedure public.log_listing_history();
