-- Milestone 9: decision-support features (saved searches + alerts,
-- per-listing private notes, hide-listing) and a persisted, in-app
-- notification system — the app had zero notification infrastructure
-- before this (not even toasts persisted anywhere).
--
-- "Compare" is deliberately NOT a new table here — comparing up to 4
-- listings is an ephemeral, current-session browsing tool (closer to a
-- shopping cart than a saved list), implemented client-side with
-- localStorage. Nothing about it needs server persistence, RLS, or a
-- migration.
--
-- Note on the `events` table from migration 006: it was created as a
-- transactional-outbox foundation but nothing has ever written to it.
-- Notifications here are created directly, synchronously, at the point of
-- each state change (see the service-layer call sites) rather than through
-- that table — in this single-process, synchronous Next.js/Supabase
-- architecture, a direct call is simpler and strictly more reliable than
-- write-then-poll indirection would be. `events` is left in place, unused,
-- as a foundation for if/when genuinely async work (e.g. outbound email)
-- needs retry semantics.

create table public.saved_searches (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  filters    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.search_alerts (
  id              uuid primary key default uuid_generate_v4(),
  saved_search_id uuid not null references public.saved_searches(id) on delete cascade,
  frequency       text not null default 'daily' check (frequency in ('instant', 'daily', 'weekly')),
  last_run_at     timestamptz,
  is_active       boolean not null default true
);

create table public.property_notes (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hidden_listings (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  hidden_at  timestamptz not null default now(),
  primary key (profile_id, listing_id)
);

create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link_href  text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index idx_saved_searches_profile_id on public.saved_searches(profile_id);
create index idx_search_alerts_saved_search_id on public.search_alerts(saved_search_id);
create index idx_search_alerts_active on public.search_alerts(is_active) where is_active = true;
create index idx_property_notes_profile_listing on public.property_notes(profile_id, listing_id);
create index idx_hidden_listings_profile_id on public.hidden_listings(profile_id);
create index idx_notifications_profile_id on public.notifications(profile_id, read_at, created_at desc);

create trigger trg_property_notes_set_updated_at
  before update on public.property_notes
  for each row execute procedure public.set_updated_at();

alter table public.saved_searches enable row level security;
alter table public.search_alerts enable row level security;
alter table public.property_notes enable row level security;
alter table public.hidden_listings enable row level security;
alter table public.notifications enable row level security;

create policy "saved_searches_all_own"
  on public.saved_searches for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "search_alerts_select_own"
  on public.search_alerts for select
  using (exists (
    select 1 from public.saved_searches s
    where s.id = search_alerts.saved_search_id and s.profile_id = auth.uid()
  ));

create policy "search_alerts_insert_own"
  on public.search_alerts for insert
  with check (exists (
    select 1 from public.saved_searches s
    where s.id = search_alerts.saved_search_id and s.profile_id = auth.uid()
  ));

create policy "search_alerts_update_own"
  on public.search_alerts for update
  using (exists (
    select 1 from public.saved_searches s
    where s.id = search_alerts.saved_search_id and s.profile_id = auth.uid()
  ));

create policy "property_notes_all_own"
  on public.property_notes for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "hidden_listings_all_own"
  on public.hidden_listings for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "notifications_select_own"
  on public.notifications for select
  using (profile_id = auth.uid());

-- Only `read_at` is ever sent by application code on an update — there's no
-- guard trigger restricting this further because a user mutating their own
-- notification's title/body only defaces their own view of it, not anyone
-- else's data, so the stakes don't warrant the extra machinery used
-- elsewhere (listings, offers) where cross-user impact is real.
create policy "notifications_update_own"
  on public.notifications for update
  using (profile_id = auth.uid());

-- No INSERT policy for authenticated/anon — notifications are only created
-- by the service-role client from service-layer code (see
-- services/notification.service.ts), matching audit_log/party_roles.
