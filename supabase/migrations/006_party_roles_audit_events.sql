-- Foundational cross-cutting tables for the transactional platform:
--   `party_roles` — per-listing (later, per-transaction) role a profile plays
--                   (buyer/seller/landlord/tenant/agent), replacing the idea
--                   of a single global account role for transaction purposes.
--   `audit_log`   — forensic record of high-impact domain changes.
--   `events`      — a plain-Postgres transactional outbox (no external queue).
--
-- All three are written only via the service-role admin client in this
-- milestone (no direct end-user writes yet), so RLS grants SELECT only,
-- scoped per table below, and no INSERT/UPDATE/DELETE policy for
-- authenticated/anon — only service_role (which bypasses RLS) can write.

-- ─── party_roles ─────────────────────────────────────────────────────────────
-- `transaction_id` is intentionally omitted here — it is added as a nullable
-- column once the `transactions` table exists (Milestone 7), rather than
-- referencing a table that doesn't exist yet.
create table public.party_roles (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        party_role_type not null,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  invited_by  uuid references public.profiles(id),
  status      text not null default 'active' check (status in ('invited', 'active', 'removed')),
  created_at  timestamptz not null default now()
);

create index idx_party_roles_profile_id on public.party_roles(profile_id);
create index idx_party_roles_listing_id on public.party_roles(listing_id);

alter table public.party_roles enable row level security;

create policy "party_roles_select"
  on public.party_roles for select
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = party_roles.listing_id and l.listed_by = auth.uid()
    )
  );

-- ─── audit_log ───────────────────────────────────────────────────────────────
create table public.audit_log (
  id           bigserial primary key,
  actor_id     uuid references public.profiles(id),
  entity_type  text not null,
  entity_id    uuid not null,
  action       text not null,
  before_data  jsonb,
  after_data   jsonb,
  created_at   timestamptz not null default now()
);

create index idx_audit_log_entity on public.audit_log(entity_type, entity_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_log_select_admin"
  on public.audit_log for select
  using (public.is_admin());

-- ─── events (transactional outbox) ─────────────────────────────────────────
create table public.events (
  id             bigserial primary key,
  aggregate_type text not null,
  aggregate_id   uuid not null,
  event_type     text not null,
  payload        jsonb not null default '{}',
  status         text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  attempts       smallint not null default 0,
  created_at     timestamptz not null default now(),
  processed_at   timestamptz
);

create index idx_events_status_created on public.events(status, created_at) where status = 'pending';

alter table public.events enable row level security;
-- No select/write policies for authenticated/anon: this is an internal
-- dispatch queue, read/written only by the service-role dispatcher.
