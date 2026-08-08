-- Neon PostgreSQL schema generated from legacy-platform/migrations/*.sql.
-- Apply manually after enabling Neon Auth and Data API. No data is included.


-- >>> legacy-platform/migrations/001_init.sql

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type user_role as enum ('user', 'admin');
create type user_plan as enum ('free', 'pro', 'agency');
create type property_status as enum ('pending', 'approved', 'rejected');
create type listing_type as enum ('sale', 'rent');

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- profiles: one row per neon_auth.user entry
create table public.profiles (
  id            uuid primary key references neon_auth."user"(id) on delete cascade,
  email         text unique not null,
  name          text not null,
  phone         text not null default '',
  profile_image text,
  bio           text,
  plan          user_plan not null default 'free',
  role          user_role not null default 'user',
  is_banned     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- properties
create table public.properties (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  title           text not null,
  city            text not null,
  address         text,
  listing_type    listing_type not null,
  price           numeric(15, 2) not null,
  bedrooms        smallint,
  bathrooms       smallint,
  area_sq_m       numeric(10, 2),
  description     text not null,
  status          property_status not null default 'pending',
  is_sold         boolean not null default false,
  sold_at         timestamptz,
  is_featured     boolean not null default false,
  featured_until  timestamptz,
  images          text[] not null default '{}',
  cover_image     text,
  created_at      timestamptz not null default now()
);

-- saved_properties: junction table
create table public.saved_properties (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  saved_at    timestamptz not null default now(),
  primary key (user_id, property_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index idx_properties_status       on public.properties(status);
create index idx_properties_user_id      on public.properties(user_id);
create index idx_properties_city         on public.properties(city);
create index idx_properties_listing_type on public.properties(listing_type);
create index idx_properties_is_featured  on public.properties(is_featured) where is_featured = true;
create index idx_properties_created_at   on public.properties(created_at desc);

-- ─── Trigger: auto-create profile on signup ──────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, role, plan)
  values (
    new.id,
    new.email,
    coalesce(new.name, split_part(new.email, '@', 1)),
    '',
    'user',
    'free'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on neon_auth."user"
  for each row execute procedure public.handle_new_user();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.saved_properties enable row level security;

-- Helper: check if current user is admin (avoids recursive RLS)
create or replace function public.is_admin() returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles policies
create policy "profiles_select_all"
  on public.profiles for select using (true);

create policy "profiles_update_self_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- properties policies
create policy "properties_select"
  on public.properties for select
  using (
    status = 'approved'
    or user_id = auth.uid()
    or public.is_admin()
  );

create policy "properties_insert"
  on public.properties for insert
  with check (auth.uid() = user_id);

create policy "properties_update"
  on public.properties for update
  using (user_id = auth.uid() or public.is_admin());

create policy "properties_delete"
  on public.properties for delete
  using (user_id = auth.uid() or public.is_admin());

-- saved_properties policies
create policy "saved_select_own"
  on public.saved_properties for select
  using (auth.uid() = user_id);

create policy "saved_insert_own"
  on public.saved_properties for insert
  with check (auth.uid() = user_id);

create policy "saved_delete_own"
  on public.saved_properties for delete
  using (auth.uid() = user_id);

-- ─── Analytics SQL functions ──────────────────────────────────────────────────
create or replace function public.get_properties_by_status()
  returns table(status text, count bigint)
  language sql stable security definer as $$
  select status::text, count(*) from public.properties group by status;
$$;

create or replace function public.get_properties_by_type()
  returns table(type text, count bigint)
  language sql stable security definer as $$
  select listing_type::text, count(*) from public.properties group by listing_type;
$$;

create or replace function public.get_top_cities(p_limit int default 10)
  returns table(city text, count bigint)
  language sql stable security definer as $$
  select city, count(*)
  from public.properties
  where status = 'approved'
  group by city
  order by count desc
  limit p_limit;
$$;

create or replace function public.get_users_by_plan()
  returns table(plan text, count bigint)
  language sql stable security definer as $$
  select plan::text, count(*) from public.profiles group by plan;
$$;

-- >>> legacy-platform/migrations/002_security_hardening.sql

-- Security hardening for signup defaults and profile updates.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, role, plan)
  values (
    new.id,
    new.email,
    coalesce(new.name, split_part(new.email, '@', 1)),
    '',
    'user',
    'free'
  );
  return new;
end;
$$;

drop policy if exists "profiles_update_self_or_admin" on public.profiles;

create policy "profiles_update_admin_only"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- >>> legacy-platform/migrations/003_harden_function_search_path.sql

-- Harden SQL function execution context and remove unnecessary definer rights.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.get_properties_by_status()
returns table(status text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select properties.status::text, count(*)
  from public.properties as properties
  group by properties.status;
$$;

create or replace function public.get_properties_by_type()
returns table(type text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select properties.listing_type::text, count(*)
  from public.properties as properties
  group by properties.listing_type;
$$;

create or replace function public.get_top_cities(p_limit int default 10)
returns table(city text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select properties.city, count(*)
  from public.properties as properties
  where properties.status = 'approved'
  group by properties.city
  order by count(*) desc, properties.city asc
  limit p_limit;
$$;

create or replace function public.get_users_by_plan()
returns table(plan text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select profiles.plan::text, count(*)
  from public.profiles as profiles
  group by profiles.plan;
$$;

revoke all on function public.get_properties_by_status() from public;
revoke all on function public.get_properties_by_type() from public;
revoke all on function public.get_top_cities(int) from public;
revoke all on function public.get_users_by_plan() from public;

-- Admin analytics functions are intentionally not granted to Data API roles.
-- Trusted server code should use a direct server-side database connection for
-- privileged analytics/admin reads.

-- >>> legacy-platform/migrations/004_property_privilege_guard.sql

-- P0 hotfix: close a privilege-escalation gap in the `properties_update` RLS
-- policy. That policy allows any owner (`user_id = auth.uid()`) to update
-- their own row — but RLS's `USING` clause does not restrict *which columns*
-- can change. Today the only thing stopping a non-admin from setting
-- `status = 'approved'` or `is_featured = true` on their own listing via a
-- direct PostgREST call (anon key + their JWT) is the Server Action's
-- app-layer `sanitizePropertyInput()` in app/actions/properties.ts — which a
-- direct API call bypasses entirely.
--
-- This adds a BEFORE UPDATE trigger that rejects any non-admin attempt to
-- change `status`, `is_featured`, `featured_until`, or `user_id`, enforced
-- inside the database itself. `is_sold`/`sold_at` are intentionally excluded
-- — toggling sold status is a legitimate owner-only action today.
--
-- Shipped standalone, ahead of the properties/listings schema split, so the
-- hole is closed immediately regardless of when the larger migration lands.

create or replace function public.enforce_properties_privilege_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if new.status is distinct from old.status
      or new.is_featured is distinct from old.is_featured
      or new.featured_until is distinct from old.featured_until
      or new.user_id is distinct from old.user_id
    then
      raise exception 'Only admins may change status, is_featured, featured_until, or user_id on properties'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_properties_privilege_guard on public.properties;

create trigger trg_properties_privilege_guard
  before update on public.properties
  for each row execute procedure public.enforce_properties_privilege_guard();

-- >>> legacy-platform/migrations/005_split_properties_listings.sql

-- Splits the monolithic `properties` table into:
--   `properties` — the physical asset (address, city, geo, bed/bath/area, media)
--   `listings`   — the market advertisement (price, listing type, moderation
--                  status, lifecycle status, featuring)
--
-- Today one row conflates "the physical unit" with "an active ad for it" and
-- bundles three orthogonal states (moderation status, sold/unsold, featured)
-- onto that single row. Splitting means a unit can be re-listed, taken off
-- market, or retain physical facts independent of any one ad's lifecycle.
--
-- Migration strategy (additive, no data loss):
--   1. Create the new `properties` (physical) and `listings` (market) tables.
--   2. Backfill: one `properties` row + one `listings` row per legacy row.
--      The new `listings.id` is set equal to the legacy `properties.id`, so
--      existing `saved_properties.property_id` values keep working unchanged
--      once that FK is repointed at `listings` below — no data rewrite needed.
--   3. Rename the old table to `properties_legacy` (not dropped) as a
--      rollback fence. It keeps its RLS/guard trigger from migration 004.
--   4. Repoint `saved_properties.property_id` at `listings(id)`.
--   5. Update the analytics RPC functions to read from the new tables.
--
-- `properties_legacy` is dropped in a later migration only after confirming
-- zero application references to it (Milestone 3).

-- ─── New enums ──────────────────────────────────────────────────────────────
create type listing_moderation_status as enum ('pending', 'approved', 'rejected');
create type listing_lifecycle_status as enum (
  'available', 'under_offer', 'under_contract', 'sold', 'leased',
  'withdrawn', 'expired', 'archived'
);
create type party_role_type as enum (
  'buyer', 'seller', 'landlord', 'tenant', 'listing_agent', 'buyer_agent', 'other'
);

-- ─── New `properties` table (physical asset) ───────────────────────────────
-- Table-rename below frees up the `properties` name for this new definition.
-- Renaming a table does not rename its constraints/indexes, so those are
-- renamed explicitly to free up the names the new `properties` table needs.
alter table public.properties rename to properties_legacy;
alter table public.properties_legacy rename constraint properties_pkey to properties_legacy_pkey;
alter index idx_properties_status       rename to idx_properties_legacy_status;
alter index idx_properties_user_id      rename to idx_properties_legacy_user_id;
alter index idx_properties_city         rename to idx_properties_legacy_city;
alter index idx_properties_listing_type rename to idx_properties_legacy_listing_type;
alter index idx_properties_is_featured  rename to idx_properties_legacy_is_featured;
alter index idx_properties_created_at   rename to idx_properties_legacy_created_at;

create table public.properties (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  address         text,
  city            text not null,
  lat             numeric(9, 6),
  lng             numeric(9, 6),
  geocode_status  text not null default 'pending'
                    check (geocode_status in ('pending', 'ok', 'failed', 'skipped')),
  bedrooms        smallint,
  bathrooms       smallint,
  area_sq_m       numeric(10, 2),
  property_type   text,
  images          text[] not null default '{}',
  cover_image     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- backfill-only column, dropped at the end of this migration
  source_legacy_id uuid
);

-- ─── New `listings` table (market advertisement) ───────────────────────────
create table public.listings (
  id                 uuid primary key default uuid_generate_v4(),
  property_id        uuid not null references public.properties(id) on delete cascade,
  listed_by          uuid not null references public.profiles(id) on delete cascade,
  listing_type       listing_type not null,
  title              text not null,
  description        text not null,
  price              numeric(15, 2) not null,
  moderation_status  listing_moderation_status not null default 'pending',
  lifecycle_status   listing_lifecycle_status not null default 'available',
  is_featured        boolean not null default false,
  featured_until     timestamptz,
  sold_at            timestamptz,
  rejection_reason   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- At most one "live" listing per physical property at a time. Nothing in the
-- app creates a second listing for an existing property yet (re-listing
-- lands in a later milestone), but the invariant is cheap to establish now.
create unique index uq_listings_one_live_per_property
  on public.listings(property_id)
  where moderation_status = 'approved'
    and lifecycle_status in ('available', 'under_offer', 'under_contract');

create index idx_listings_moderation_status on public.listings(moderation_status);
create index idx_listings_lifecycle_status  on public.listings(lifecycle_status);
create index idx_listings_property_id       on public.listings(property_id);
create index idx_listings_listed_by         on public.listings(listed_by);
create index idx_listings_listing_type      on public.listings(listing_type);
create index idx_listings_is_featured       on public.listings(is_featured) where is_featured = true;
create index idx_listings_created_at        on public.listings(created_at desc);

create index idx_properties_owner_id on public.properties(owner_id);
create index idx_properties_city     on public.properties(city);
create index idx_properties_lat_lng  on public.properties(lat, lng);

-- ─── Backfill ────────────────────────────────────────────────────────────────
insert into public.properties (
  owner_id, address, city, bedrooms, bathrooms, area_sq_m, images, cover_image,
  created_at, updated_at, source_legacy_id
)
select
  user_id, address, city, bedrooms, bathrooms, area_sq_m, images, cover_image,
  created_at, created_at, id
from public.properties_legacy;

insert into public.listings (
  id, property_id, listed_by, listing_type, title, description, price,
  moderation_status, lifecycle_status, is_featured, featured_until, sold_at,
  created_at, updated_at
)
select
  legacy.id,
  phys.id,
  legacy.user_id,
  legacy.listing_type,
  legacy.title,
  legacy.description,
  legacy.price,
  legacy.status::text::listing_moderation_status,
  case
    when legacy.is_sold and legacy.listing_type = 'rent' then 'leased'::listing_lifecycle_status
    when legacy.is_sold then 'sold'::listing_lifecycle_status
    else 'available'::listing_lifecycle_status
  end,
  legacy.is_featured,
  legacy.featured_until,
  legacy.sold_at,
  legacy.created_at,
  legacy.created_at
from public.properties_legacy legacy
join public.properties phys on phys.source_legacy_id = legacy.id;

alter table public.properties drop column source_legacy_id;

-- ─── Repoint saved_properties at listings ───────────────────────────────────
-- Values are already valid: listings.id was set equal to the legacy
-- properties.id above, so no data rewrite is needed — only the FK target.
alter table public.saved_properties
  drop constraint saved_properties_property_id_fkey;

alter table public.saved_properties
  add constraint saved_properties_property_id_fkey
  foreign key (property_id) references public.listings(id) on delete cascade;

-- ─── updated_at maintenance ──────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_properties_set_updated_at
  before update on public.properties
  for each row execute procedure public.set_updated_at();

create trigger trg_listings_set_updated_at
  before update on public.listings
  for each row execute procedure public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.properties enable row level security;
alter table public.listings enable row level security;

create policy "properties_select"
  on public.properties for select
  using (
    owner_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.property_id = properties.id and l.moderation_status = 'approved'
    )
  );

create policy "properties_insert"
  on public.properties for insert
  with check (auth.uid() = owner_id);

create policy "properties_update"
  on public.properties for update
  using (owner_id = auth.uid() or public.is_admin());

create policy "properties_delete"
  on public.properties for delete
  using (owner_id = auth.uid() or public.is_admin());

create policy "listings_select"
  on public.listings for select
  using (
    moderation_status = 'approved'
    or listed_by = auth.uid()
    or public.is_admin()
  );

create policy "listings_insert"
  on public.listings for insert
  with check (
    auth.uid() = listed_by
    and (
      public.is_admin()
      or exists (
        select 1 from public.properties p
        where p.id = property_id and p.owner_id = auth.uid()
      )
    )
  );

create policy "listings_update"
  on public.listings for update
  using (listed_by = auth.uid() or public.is_admin());

create policy "listings_delete"
  on public.listings for delete
  using (listed_by = auth.uid() or public.is_admin());

-- P0 guard, same shape as migration 004, now on the live table: a non-admin
-- may not directly change moderation_status, is_featured, featured_until,
-- listed_by, or rejection_reason on UPDATE. lifecycle_status is
-- intentionally excluded — toggling sold/leased remains an owner-only
-- action. On INSERT, a non-admin may only create a listing that starts
-- 'pending', unfeatured, with no rejection reason — otherwise the INSERT
-- RLS `with check` alone would still let a direct PostgREST call create an
-- already-approved, already-featured listing outright.
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
    return new;
  end if;

  if not public.is_admin() then
    if new.moderation_status is distinct from old.moderation_status
      or new.is_featured is distinct from old.is_featured
      or new.featured_until is distinct from old.featured_until
      or new.listed_by is distinct from old.listed_by
      or new.rejection_reason is distinct from old.rejection_reason
    then
      raise exception 'Only admins may change moderation_status, is_featured, featured_until, listed_by, or rejection_reason on listings'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_listings_privilege_guard
  before insert or update on public.listings
  for each row execute procedure public.enforce_listings_privilege_guard();

-- ─── Atomic create: one physical property + one listing in a single call ───
-- Runs SECURITY INVOKER so the normal RLS `with check` clauses on both
-- inserts still apply against the calling user — this is not a privilege
-- escalation path, just a way to make the two-table insert atomic (a single
-- function call is a single implicit transaction) without needing
-- multi-statement transaction support from PostgREST.
create or replace function public.create_property_listing(
  p_owner_id uuid,
  p_address text,
  p_city text,
  p_bedrooms smallint,
  p_bathrooms smallint,
  p_area_sq_m numeric,
  p_images text[],
  p_cover_image text,
  p_listing_type listing_type,
  p_title text,
  p_description text,
  p_price numeric
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_property_id uuid;
  v_listing_id uuid;
begin
  insert into public.properties (owner_id, address, city, bedrooms, bathrooms, area_sq_m, images, cover_image)
  values (p_owner_id, p_address, p_city, p_bedrooms, p_bathrooms, p_area_sq_m, p_images, p_cover_image)
  returning id into v_property_id;

  insert into public.listings (property_id, listed_by, listing_type, title, description, price, moderation_status, lifecycle_status)
  values (v_property_id, p_owner_id, p_listing_type, p_title, p_description, p_price, 'pending', 'available')
  returning id into v_listing_id;

  return v_listing_id;
end;
$$;

grant execute on function public.create_property_listing(
  uuid, text, text, smallint, smallint, numeric, text[], text, listing_type, text, text, numeric
) to authenticated;

-- ─── Analytics RPCs: now read from listings/properties ─────────────────────
create or replace function public.get_properties_by_status()
returns table(status text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select listings.moderation_status::text, count(*)
  from public.listings as listings
  group by listings.moderation_status;
$$;

create or replace function public.get_properties_by_type()
returns table(type text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select listings.listing_type::text, count(*)
  from public.listings as listings
  group by listings.listing_type;
$$;

create or replace function public.get_top_cities(p_limit int default 10)
returns table(city text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select properties.city, count(*)
  from public.listings as listings
  join public.properties as properties on properties.id = listings.property_id
  where listings.moderation_status = 'approved'
  group by properties.city
  order by count(*) desc, properties.city asc
  limit p_limit;
$$;

revoke all on function public.get_properties_by_status() from public;
revoke all on function public.get_properties_by_type() from public;
revoke all on function public.get_top_cities(int) from public;

-- Admin analytics functions are intentionally not granted to Data API roles.

-- >>> legacy-platform/migrations/006_party_roles_audit_events.sql

-- Foundational cross-cutting tables for the transactional platform:
--   `party_roles` — per-listing (later, per-transaction) role a profile plays
--                   (buyer/seller/landlord/tenant/agent), replacing the idea
--                   of a single global account role for transaction purposes.
--   `audit_log`   — forensic record of high-impact domain changes.
--   `events`      — a plain-Postgres transactional outbox (no external queue).
--
-- All three are written only via trusted server-side code in this milestone
-- (no direct end-user writes yet), so RLS grants SELECT only, scoped per
-- table below, and no INSERT/UPDATE/DELETE policy for authenticated/anonymous
-- users.

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
-- No select/write policies for authenticated/anonymous users: this is an
-- internal dispatch queue read/written only by trusted server-side code.

-- >>> legacy-platform/migrations/007_profiles_billing_fields.sql

-- Closes the unclosed Stripe billing loop: `createCheckoutSessionAction`
-- creates a real subscription checkout session, but nothing previously
-- persisted the Stripe customer/subscription identifiers, so no webhook
-- could correlate future subscription lifecycle events (renewal, plan
-- change, cancellation) back to a profile. `profiles.plan` was only ever
-- updated by a manual admin override.
--
-- These columns are written exclusively by the Stripe webhook handler
-- (app/api/webhooks/stripe/route.ts) — no RLS policy grants end users direct
-- write access to them.

alter table public.profiles
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text;

create index idx_profiles_stripe_customer_id on public.profiles(stripe_customer_id);

-- >>> legacy-platform/migrations/008_listing_status_machine.sql

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

-- >>> legacy-platform/migrations/009_drop_properties_legacy.sql

-- DO NOT RUN THIS AUTOMATICALLY AS PART OF A ROUTINE "apply all migrations"
-- PASS. `properties_legacy` is the rollback fence left by migration 005 —
-- dropping it is irreversible. Application code has zero references to it
-- (verified via repo-wide grep as of Milestone 3), which satisfies the
-- code-side half of the safety check, but that is not sufficient on its
-- own. Before running this migration against a real database, confirm:
--
--   1. Migrations 001-008 have been applied to that database and the app
--      has been running against the new `properties`/`listings` tables for
--      at least one full release cycle with no reported data issues.
--   2. `select count(*) from properties_legacy` matches the row count you
--      expect from before the split, and spot-checking a handful of rows
--      against their corresponding `properties`/`listings` rows (same id on
--      `listings`) shows the backfill carried every field over correctly.
--   3. You have a database backup/snapshot taken before running this, in
--      addition to whatever the legacy table itself would have provided as
--      a fallback.
--
-- Only once all three are true should this be applied.

drop table if exists public.properties_legacy;

-- >>> legacy-platform/migrations/010_backfill_owner_party_roles.sql

-- Milestone 4: gives every existing listing owner an explicit party_roles
-- row (seller for sale listings, landlord for rent listings), so the
-- dashboard's "Your Roles" summary has real data from day one instead of
-- only reflecting listings created after this migration. Going forward,
-- new listings get this row automatically at creation time — see
-- `ensureOwnerPartyRole` in services/party.service.ts, called from
-- `createProperty` in services/listing.service.ts.
--
-- This is the first migration to actually write data into `party_roles`
-- (created empty in migration 006), so there is no pre-existing-duplicate
-- risk here — the unique index below is a forward-looking safety net
-- against `ensureOwnerPartyRole` (or any future caller) accidentally
-- inserting the same role twice for the same listing.

create unique index uq_party_roles_profile_role_listing
  on public.party_roles(profile_id, role, listing_id);

insert into public.party_roles (profile_id, role, listing_id, status)
select
  listed_by,
  case
    when listing_type = 'rent' then 'landlord'::party_role_type
    else 'seller'::party_role_type
  end,
  id,
  'active'
from public.listings;

-- >>> legacy-platform/migrations/011_viewings.sql

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

-- >>> legacy-platform/migrations/012_conversations_messages_inquiries.sql

-- Milestone 5: replaces the bare mailto/tel sidebar with structured contact.
-- `inquiries` is a lightweight one-shot "I'm interested" record — cheap to
-- send, doesn't require spinning up a full thread. A reply from the listing
-- owner promotes it into a real `conversations` thread (see
-- `reply_to_inquiry` below), carrying the original question over as the
-- thread's first message so context isn't lost.

create table public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  -- Linked to a transaction once one exists (Milestone 7) — no FK yet since
  -- that table doesn't exist. Additive column, added there.
  transaction_id  uuid,
  created_at      timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  body            text not null,
  attachment_url  text,
  created_at      timestamptz not null default now()
);

create table public.inquiries (
  id              uuid primary key default uuid_generate_v4(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  message         text not null,
  conversation_id uuid references public.conversations(id),
  status          text not null default 'new' check (status in ('new', 'replied', 'closed')),
  created_at      timestamptz not null default now()
);

create index idx_conversations_listing_id          on public.conversations(listing_id);
create index idx_conversation_participants_profile on public.conversation_participants(profile_id);
create index idx_messages_conversation_created      on public.messages(conversation_id, created_at);
create index idx_inquiries_listing_id               on public.inquiries(listing_id);
create index idx_inquiries_from_profile_id          on public.inquiries(from_profile_id);
create index idx_inquiries_status                   on public.inquiries(status);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.inquiries enable row level security;

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.profile_id = auth.uid()
  );
$$;

-- No INSERT policy on conversations/conversation_participants for
-- authenticated/anon: a conversation is only ever created atomically (with
-- its participants and first message) via `reply_to_inquiry` below, or a
-- future equivalent RPC. Messages within an existing conversation are a
-- plain insert, gated by messages_insert.
create policy "conversations_select"
  on public.conversations for select
  using (public.is_conversation_participant(id) or public.is_admin());

create policy "conversation_participants_select"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id) or public.is_admin());

create policy "messages_select"
  on public.messages for select
  using (public.is_conversation_participant(conversation_id) or public.is_admin());

create policy "messages_insert"
  on public.messages for insert
  with check (auth.uid() = sender_id and public.is_conversation_participant(conversation_id));

create policy "inquiries_select"
  on public.inquiries for select
  using (
    from_profile_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.listings l where l.id = listing_id and l.listed_by = auth.uid())
  );

create policy "inquiries_insert"
  on public.inquiries for insert
  with check (
    auth.uid() = from_profile_id
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.listed_by <> auth.uid()
    )
  );

create policy "inquiries_update"
  on public.inquiries for update
  using (
    from_profile_id = auth.uid()
    or exists (select 1 from public.listings l where l.id = listing_id and l.listed_by = auth.uid())
    or public.is_admin()
  );

-- `inquiries_update`'s USING clause governs WHO can attempt an update
-- (sender, listing owner, admin); this trigger governs WHAT they're allowed
-- to change, regardless of who they are — the same column-privilege pattern
-- established for `listings` in migrations 005/008. `conversation_id` may
-- move from null to a value exactly once (the reply-promotion path) and
-- never change again via a direct client update; `status` only moves
-- forward (new -> replied|closed, replied -> closed).
create or replace function public.enforce_inquiries_privilege_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.listing_id is distinct from old.listing_id
    or new.from_profile_id is distinct from old.from_profile_id
    or new.message is distinct from old.message
  then
    raise exception 'listing_id, from_profile_id, and message cannot be changed after an inquiry is created'
      using errcode = '42501';
  end if;

  if old.conversation_id is not null and new.conversation_id is distinct from old.conversation_id then
    raise exception 'conversation_id cannot be changed once set'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
    and not (
      (old.status = 'new' and new.status in ('replied', 'closed'))
      or (old.status = 'replied' and new.status = 'closed')
    )
  then
    raise exception 'Invalid inquiry status transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger trg_inquiries_privilege_guard
  before update on public.inquiries
  for each row execute procedure public.enforce_inquiries_privilege_guard();

-- ─── Promote an inquiry into a real conversation ────────────────────────────
-- SECURITY DEFINER because it performs a coordinated multi-table write
-- (conversations + conversation_participants + messages, none of which have
-- a general INSERT policy for authenticated users) — authorization is
-- therefore enforced explicitly in the function body, not via RLS.
create or replace function public.reply_to_inquiry(p_inquiry_id uuid, p_reply_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id       uuid;
  v_from_profile_id  uuid;
  v_original_message text;
  v_owner_id         uuid;
  v_conversation_id  uuid;
begin
  select listing_id, from_profile_id, message
    into v_listing_id, v_from_profile_id, v_original_message
  from public.inquiries
  where id = p_inquiry_id;

  if v_listing_id is null then
    raise exception 'Inquiry not found' using errcode = 'P0002';
  end if;

  select listed_by into v_owner_id from public.listings where id = v_listing_id;

  if auth.uid() is null or v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Only the listing owner may reply to this inquiry'
      using errcode = '42501';
  end if;

  insert into public.conversations (listing_id)
  values (v_listing_id)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, profile_id)
  values (v_conversation_id, v_from_profile_id), (v_conversation_id, v_owner_id);

  insert into public.messages (conversation_id, sender_id, body)
  values
    (v_conversation_id, v_from_profile_id, v_original_message),
    (v_conversation_id, v_owner_id, p_reply_body);

  update public.inquiries
  set conversation_id = v_conversation_id, status = 'replied'
  where id = p_inquiry_id;

  return v_conversation_id;
end;
$$;

grant execute on function public.reply_to_inquiry(uuid, text) to authenticated;

-- >>> legacy-platform/migrations/013_offers_applications_transactions.sql

-- Milestone 6: offers (with immutable revision history), rental
-- applications (a separate workflow — not a generic "request" object), and
-- a `transactions` shell created automatically when an offer is accepted or
-- an application is approved. The full transaction workspace UI lands in
-- Milestone 7; this migration only creates the row and the minimal fields
-- needed to track it (contract/payment/payout/dispute status are
-- independent from day one, per the "never derive contract state from
-- payment state" constraint — nothing populates payment/payout/dispute yet,
-- that's Milestone 8).

-- ─── Shared helper: idempotent party role creation ─────────────────────────
create or replace function public.ensure_party_role(
  p_profile_id uuid, p_role party_role_type, p_listing_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.party_roles
  where profile_id = p_profile_id and role = p_role and listing_id = p_listing_id;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.party_roles (profile_id, role, listing_id, status)
  values (p_profile_id, p_role, p_listing_id, 'active')
  returning id into v_id;

  return v_id;
end;
$$;

-- ─── Offers ──────────────────────────────────────────────────────────────────
create type offer_status as enum (
  'submitted', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired'
);

create table public.offers (
  id                  uuid primary key default uuid_generate_v4(),
  listing_id          uuid not null references public.listings(id) on delete cascade,
  buyer_party_id      uuid not null references public.party_roles(id),
  seller_party_id     uuid not null references public.party_roles(id),
  status              offer_status not null default 'submitted',
  current_revision_id uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Append-only: a counter is a new row, never a mutated one. See "never
-- overwrite historical offers" in the project constraints.
create table public.offer_revisions (
  id              uuid primary key default uuid_generate_v4(),
  offer_id        uuid not null references public.offers(id) on delete cascade,
  revision_number int not null,
  proposed_by     uuid not null references public.profiles(id),
  price           numeric(15, 2) not null,
  contingencies   jsonb not null default '{}',
  closing_date    date,
  expires_at      timestamptz,
  message         text,
  created_at      timestamptz not null default now(),
  unique (offer_id, revision_number)
);

alter table public.offers
  add constraint offers_current_revision_fkey
  foreign key (current_revision_id) references public.offer_revisions(id);

create index idx_offers_listing_id      on public.offers(listing_id);
create index idx_offers_buyer_party_id  on public.offers(buyer_party_id);
create index idx_offers_seller_party_id on public.offers(seller_party_id);
create index idx_offer_revisions_offer  on public.offer_revisions(offer_id, revision_number);

create trigger trg_offers_set_updated_at
  before update on public.offers
  for each row execute procedure public.set_updated_at();

alter table public.offers enable row level security;
alter table public.offer_revisions enable row level security;

create or replace function public.is_offer_party(p_offer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.offers o
    join public.party_roles pr on pr.id in (o.buyer_party_id, o.seller_party_id)
    where o.id = p_offer_id and pr.profile_id = auth.uid()
  );
$$;

create policy "offers_select"
  on public.offers for select
  using (public.is_offer_party(id) or public.is_admin());

-- No INSERT policy: offers are only created via `submit_offer` below
-- (SECURITY DEFINER — the buyer-owns-the-party-role and listing-eligibility
-- checks are manual, not RLS-expressible in one clause).
create policy "offers_update"
  on public.offers for update
  using (public.is_offer_party(id) or public.is_admin());

create policy "offer_revisions_select"
  on public.offer_revisions for select
  using (public.is_offer_party(offer_id) or public.is_admin());

-- ─── Offer transition graph ──────────────────────────────────────────────────
-- submitted/countered -> accepted|rejected|withdrawn|expired; submitted ->
-- countered. A fresh counter-round keeps status='countered' (only
-- current_revision_id changes) — handled by `counter_offer` below, not a
-- status transition captured in this table.
create or replace function public.is_valid_offer_transition(
  p_old offer_status, p_new offer_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('submitted', 'countered'),
    ('submitted', 'accepted'),
    ('submitted', 'rejected'),
    ('submitted', 'withdrawn'),
    ('submitted', 'expired'),
    ('countered', 'accepted'),
    ('countered', 'rejected'),
    ('countered', 'withdrawn'),
    ('countered', 'expired')
  );
$$;

create or replace function public.enforce_offer_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last_proposer  uuid;
  v_buyer_profile  uuid;
  v_seller_profile uuid;
begin
  if new.listing_id is distinct from old.listing_id
    or new.buyer_party_id is distinct from old.buyer_party_id
    or new.seller_party_id is distinct from old.seller_party_id
  then
    raise exception 'listing_id, buyer_party_id, and seller_party_id cannot be changed'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not public.is_valid_offer_transition(old.status, new.status) then
      raise exception 'Invalid offer status transition: % -> %', old.status, new.status
        using errcode = '22023';
    end if;

    select profile_id into v_buyer_profile from public.party_roles where id = old.buyer_party_id;
    select profile_id into v_seller_profile from public.party_roles where id = old.seller_party_id;
    select proposed_by into v_last_proposer from public.offer_revisions where id = old.current_revision_id;

    if new.status in ('accepted', 'rejected') then
      if public.is_admin() then
        null;
      elsif auth.uid() = v_last_proposer then
        raise exception 'Only the party who did not propose the current terms may accept or reject them'
          using errcode = '42501';
      elsif auth.uid() <> v_buyer_profile and auth.uid() <> v_seller_profile then
        raise exception 'Not a party to this offer' using errcode = '42501';
      end if;
    elsif new.status = 'withdrawn' then
      if not (auth.uid() = v_buyer_profile or auth.uid() = v_seller_profile or public.is_admin()) then
        raise exception 'Not a party to this offer' using errcode = '42501';
      end if;
    elsif new.status = 'expired' and not public.is_admin() then
      raise exception 'Only an admin/system process may expire an offer'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_offers_transition
  before update on public.offers
  for each row execute procedure public.enforce_offer_transition();

-- ─── submit_offer / counter_offer / accept_offer ────────────────────────────
-- SECURITY DEFINER: each performs checks that aren't expressible as a
-- single RLS clause (listing eligibility, "not your own listing", "not the
-- last proposer"), then relies on the guard trigger above for the actual
-- status-transition authorization on any UPDATE it performs — the trigger
-- fires regardless of the calling function's security context, so
-- authorization is not duplicated, only the listing/party setup is.
create or replace function public.submit_offer(
  p_listing_id uuid,
  p_price numeric,
  p_contingencies jsonb,
  p_closing_date date,
  p_expires_at timestamptz,
  p_message text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id       uuid;
  v_listing_type   public.listing_type;
  v_moderation     public.listing_moderation_status;
  v_lifecycle      public.listing_lifecycle_status;
  v_buyer_party_id uuid;
  v_seller_party_id uuid;
  v_offer_id       uuid;
  v_revision_id    uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select listed_by, listing_type, moderation_status, lifecycle_status
    into v_owner_id, v_listing_type, v_moderation, v_lifecycle
  from public.listings
  where id = p_listing_id;

  if v_owner_id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  if v_listing_type <> 'sale' then
    raise exception 'Offers only apply to sale listings — use a rental application instead'
      using errcode = '22023';
  end if;
  if v_owner_id = auth.uid() then
    raise exception 'You cannot make an offer on your own listing' using errcode = '42501';
  end if;
  if v_moderation <> 'approved' or v_lifecycle not in ('available', 'under_offer') then
    raise exception 'This listing is not currently accepting offers' using errcode = '22023';
  end if;

  v_buyer_party_id := public.ensure_party_role(auth.uid(), 'buyer', p_listing_id);
  v_seller_party_id := public.ensure_party_role(v_owner_id, 'seller', p_listing_id);

  insert into public.offers (listing_id, buyer_party_id, seller_party_id, status)
  values (p_listing_id, v_buyer_party_id, v_seller_party_id, 'submitted')
  returning id into v_offer_id;

  insert into public.offer_revisions (offer_id, revision_number, proposed_by, price, contingencies, closing_date, expires_at, message)
  values (v_offer_id, 1, auth.uid(), p_price, coalesce(p_contingencies, '{}'), p_closing_date, p_expires_at, p_message)
  returning id into v_revision_id;

  update public.offers set current_revision_id = v_revision_id where id = v_offer_id;

  if v_lifecycle = 'available' then
    update public.listings set lifecycle_status = 'under_offer' where id = p_listing_id;
  end if;

  return v_offer_id;
end;
$$;

create or replace function public.counter_offer(
  p_offer_id uuid,
  p_price numeric,
  p_contingencies jsonb,
  p_closing_date date,
  p_expires_at timestamptz,
  p_message text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status          public.offer_status;
  v_buyer_profile   uuid;
  v_seller_profile  uuid;
  v_last_proposer   uuid;
  v_next_revision   int;
  v_revision_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select o.status, pr_b.profile_id, pr_s.profile_id, rev.proposed_by, coalesce(max(all_rev.revision_number), 0)
    into v_status, v_buyer_profile, v_seller_profile, v_last_proposer, v_next_revision
  from public.offers o
  join public.party_roles pr_b on pr_b.id = o.buyer_party_id
  join public.party_roles pr_s on pr_s.id = o.seller_party_id
  left join public.offer_revisions rev on rev.id = o.current_revision_id
  left join public.offer_revisions all_rev on all_rev.offer_id = o.id
  where o.id = p_offer_id
  group by o.status, pr_b.profile_id, pr_s.profile_id, rev.proposed_by;

  if v_status is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if v_status not in ('submitted', 'countered') then
    raise exception 'This offer is no longer open for negotiation' using errcode = '22023';
  end if;
  if auth.uid() <> v_buyer_profile and auth.uid() <> v_seller_profile then
    raise exception 'Not a party to this offer' using errcode = '42501';
  end if;
  if auth.uid() = v_last_proposer then
    raise exception 'You already proposed the current terms — wait for a response'
      using errcode = '42501';
  end if;

  insert into public.offer_revisions (offer_id, revision_number, proposed_by, price, contingencies, closing_date, expires_at, message)
  values (p_offer_id, v_next_revision + 1, auth.uid(), p_price, coalesce(p_contingencies, '{}'), p_closing_date, p_expires_at, p_message)
  returning id into v_revision_id;

  update public.offers set current_revision_id = v_revision_id, status = 'countered' where id = p_offer_id;

  return v_revision_id;
end;
$$;

create or replace function public.accept_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_transaction_id uuid;
begin
  select listing_id into v_listing_id from public.offers where id = p_offer_id;
  if v_listing_id is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;

  -- The guard trigger validates the transition and who may perform it; it
  -- fires regardless of this function's SECURITY DEFINER context.
  update public.offers set status = 'accepted' where id = p_offer_id;

  update public.listings set lifecycle_status = 'under_contract' where id = v_listing_id;

  insert into public.transactions (listing_id, source_type, source_id)
  values (v_listing_id, 'offer', p_offer_id)
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

grant execute on function public.submit_offer(uuid, numeric, jsonb, date, timestamptz, text) to authenticated;
grant execute on function public.counter_offer(uuid, numeric, jsonb, date, timestamptz, text) to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;

-- ─── Rental applications ─────────────────────────────────────────────────────
create type rental_application_status as enum (
  'submitted', 'under_review', 'approved', 'conditionally_approved', 'rejected', 'withdrawn'
);

create table public.rental_applications (
  id                 uuid primary key default uuid_generate_v4(),
  listing_id         uuid not null references public.listings(id) on delete cascade,
  applicant_party_id uuid not null references public.party_roles(id),
  status             rental_application_status not null default 'submitted',
  monthly_income     numeric(15, 2),
  employment_note    text,
  occupants_count    smallint,
  has_pets           boolean not null default false,
  move_in_date       date,
  -- Explicit stub fields, not a real integration — see project constraints
  -- on not fabricating background/credit screening.
  screening_status   text not null default 'not_requested'
                        check (screening_status in ('not_requested', 'pending', 'stub_pass', 'stub_fail')),
  screening_provider text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_rental_applications_listing_id   on public.rental_applications(listing_id);
create index idx_rental_applications_applicant_id on public.rental_applications(applicant_party_id);

create trigger trg_rental_applications_set_updated_at
  before update on public.rental_applications
  for each row execute procedure public.set_updated_at();

alter table public.rental_applications enable row level security;

create or replace function public.is_rental_application_party(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rental_applications ra
    join public.party_roles pr on pr.id = ra.applicant_party_id
    where ra.id = p_application_id and pr.profile_id = auth.uid()
  )
  or exists (
    select 1 from public.rental_applications ra
    join public.listings l on l.id = ra.listing_id
    where ra.id = p_application_id and l.listed_by = auth.uid()
  );
$$;

create policy "rental_applications_select"
  on public.rental_applications for select
  using (public.is_rental_application_party(id) or public.is_admin());

-- No INSERT policy — created only via `submit_rental_application` below.
create policy "rental_applications_update"
  on public.rental_applications for update
  using (public.is_rental_application_party(id) or public.is_admin());

create or replace function public.is_valid_application_transition(
  p_old rental_application_status, p_new rental_application_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('submitted', 'under_review'),
    ('submitted', 'approved'),
    ('submitted', 'conditionally_approved'),
    ('submitted', 'rejected'),
    ('submitted', 'withdrawn'),
    ('under_review', 'approved'),
    ('under_review', 'conditionally_approved'),
    ('under_review', 'rejected'),
    ('under_review', 'withdrawn')
  );
$$;

create or replace function public.enforce_application_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id     uuid;
  v_applicant_id uuid;
begin
  if new.listing_id is distinct from old.listing_id
    or new.applicant_party_id is distinct from old.applicant_party_id
  then
    raise exception 'listing_id and applicant_party_id cannot be changed'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not public.is_valid_application_transition(old.status, new.status) then
      raise exception 'Invalid application status transition: % -> %', old.status, new.status
        using errcode = '22023';
    end if;

    select l.listed_by into v_owner_id from public.listings l where l.id = old.listing_id;
    select profile_id into v_applicant_id from public.party_roles where id = old.applicant_party_id;

    if new.status = 'withdrawn' then
      if not (auth.uid() = v_applicant_id or public.is_admin()) then
        raise exception 'Only the applicant may withdraw an application' using errcode = '42501';
      end if;
    elsif new.status in ('under_review', 'approved', 'conditionally_approved', 'rejected') then
      if not (auth.uid() = v_owner_id or public.is_admin()) then
        raise exception 'Only the listing owner may review this application' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_applications_transition
  before update on public.rental_applications
  for each row execute procedure public.enforce_application_transition();

create or replace function public.submit_rental_application(
  p_listing_id uuid,
  p_monthly_income numeric,
  p_employment_note text,
  p_occupants_count smallint,
  p_has_pets boolean,
  p_move_in_date date,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id     uuid;
  v_listing_type public.listing_type;
  v_moderation   public.listing_moderation_status;
  v_lifecycle    public.listing_lifecycle_status;
  v_applicant_id uuid;
  v_application_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select listed_by, listing_type, moderation_status, lifecycle_status
    into v_owner_id, v_listing_type, v_moderation, v_lifecycle
  from public.listings
  where id = p_listing_id;

  if v_owner_id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  if v_listing_type <> 'rent' then
    raise exception 'Rental applications only apply to rental listings — use an offer instead'
      using errcode = '22023';
  end if;
  if v_owner_id = auth.uid() then
    raise exception 'You cannot apply to rent your own listing' using errcode = '42501';
  end if;
  if v_moderation <> 'approved' or v_lifecycle not in ('available', 'under_offer') then
    raise exception 'This listing is not currently accepting applications' using errcode = '22023';
  end if;

  v_applicant_id := public.ensure_party_role(auth.uid(), 'tenant', p_listing_id);

  insert into public.rental_applications (
    listing_id, applicant_party_id, monthly_income, employment_note,
    occupants_count, has_pets, move_in_date, notes
  )
  values (
    p_listing_id, v_applicant_id, p_monthly_income, p_employment_note,
    p_occupants_count, p_has_pets, p_move_in_date, p_notes
  )
  returning id into v_application_id;

  if v_lifecycle = 'available' then
    update public.listings set lifecycle_status = 'under_offer' where id = p_listing_id;
  end if;

  return v_application_id;
end;
$$;

create or replace function public.approve_rental_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_transaction_id uuid;
begin
  select listing_id into v_listing_id from public.rental_applications where id = p_application_id;
  if v_listing_id is null then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  update public.rental_applications set status = 'approved' where id = p_application_id;

  update public.listings set lifecycle_status = 'under_contract' where id = v_listing_id;

  insert into public.transactions (listing_id, source_type, source_id)
  values (v_listing_id, 'rental_application', p_application_id)
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

grant execute on function public.submit_rental_application(uuid, numeric, text, smallint, boolean, date, text) to authenticated;
grant execute on function public.approve_rental_application(uuid) to authenticated;

-- ─── Transactions (shell — full workspace lands in Milestone 7) ────────────
create type transaction_status as enum (
  'active', 'pending_closing', 'completed', 'cancelled', 'terminated'
);

create table public.transactions (
  id                 uuid primary key default uuid_generate_v4(),
  listing_id         uuid not null references public.listings(id) on delete cascade,
  source_type        text not null check (source_type in ('offer', 'rental_application')),
  -- Polymorphic reference (offers.id or rental_applications.id) — no FK
  -- since it targets one of two tables; validated in application code and
  -- by the fact both creation paths above are the only writers.
  source_id          uuid not null,
  status             transaction_status not null default 'active',
  -- Independently-updatable, per the "never derive contract state from
  -- payment state" constraint. Nothing sets these beyond 'not_started'/
  -- 'none' until Milestone 8.
  contract_status    text not null default 'not_started'
                        check (contract_status in ('not_started', 'drafted', 'sent', 'partially_signed', 'fully_signed')),
  payment_status     text not null default 'not_started'
                        check (payment_status in ('not_started', 'pending', 'partial', 'held', 'released', 'refunded')),
  payout_status      text not null default 'not_started'
                        check (payout_status in ('not_started', 'pending', 'completed', 'failed')),
  dispute_status     text not null default 'none'
                        check (dispute_status in ('none', 'open', 'resolved')),
  target_close_date  date,
  closed_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_transactions_listing_id on public.transactions(listing_id);
create index idx_transactions_source     on public.transactions(source_type, source_id);

create trigger trg_transactions_set_updated_at
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

alter table public.transactions enable row level security;

create or replace function public.is_transaction_party(p_transaction_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_listing_id  uuid;
  v_source_type text;
  v_source_id   uuid;
begin
  select listing_id, source_type, source_id
    into v_listing_id, v_source_type, v_source_id
  from public.transactions
  where id = p_transaction_id;

  if v_listing_id is null then
    return false;
  end if;

  if exists (select 1 from public.listings l where l.id = v_listing_id and l.listed_by = auth.uid()) then
    return true;
  end if;

  if v_source_type = 'offer' then
    return public.is_offer_party(v_source_id);
  end if;

  return public.is_rental_application_party(v_source_id);
end;
$$;

create policy "transactions_select"
  on public.transactions for select
  using (public.is_transaction_party(id) or public.is_admin());

-- No general write policy: transactions are created only by `accept_offer`
-- / `approve_rental_application` above; status-field updates land in
-- Milestone 7 with their own transition guard.

-- >>> legacy-platform/migrations/014_transaction_workspace.sql

-- Milestone 7: the transaction status machine and `transaction_tasks`,
-- completing the workspace `transactions` shell created in Milestone 6.
-- Participants are derived from the transaction's source (offer or rental
-- application) rather than a new schema addition — the buyer/seller or
-- applicant/landlord relationship already exists on those rows.

-- ─── Transaction transition graph ───────────────────────────────────────────
-- active -> pending_closing requires contract_status = 'fully_signed' and
-- payment_status in ('held','partial') — genuinely unreachable until
-- Milestone 8 ships documents/e-signature/payments. That's intentional: the
-- workspace should not claim a deal is ready to close when nothing has
-- verified a signed contract or received funds. Admins may override for
-- support purposes.
create or replace function public.is_valid_transaction_transition(
  p_old transaction_status, p_new transaction_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('active', 'pending_closing'),
    ('active', 'cancelled'),
    ('active', 'terminated'),
    ('pending_closing', 'active'),
    ('pending_closing', 'completed'),
    ('pending_closing', 'cancelled'),
    ('pending_closing', 'terminated')
  );
$$;

create or replace function public.enforce_transaction_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.listing_id is distinct from old.listing_id
    or new.source_type is distinct from old.source_type
    or new.source_id is distinct from old.source_id
  then
    raise exception 'listing_id, source_type, and source_id cannot be changed'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not public.is_valid_transaction_transition(old.status, new.status) then
      raise exception 'Invalid transaction status transition: % -> %', old.status, new.status
        using errcode = '22023';
    end if;

    if not (public.is_transaction_party(old.id) or public.is_admin()) then
      raise exception 'Not a party to this transaction' using errcode = '42501';
    end if;

    if new.status = 'pending_closing' and not public.is_admin() then
      if old.contract_status <> 'fully_signed' or old.payment_status not in ('held', 'partial') then
        raise exception 'Cannot enter pending_closing until the contract is fully signed and payment is held or partial'
          using errcode = '22023';
      end if;
    end if;

    if new.status = 'completed' then
      new.closed_at = now();
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_transactions_transition
  before update on public.transactions
  for each row execute procedure public.enforce_transaction_transition();

create policy "transactions_update"
  on public.transactions for update
  using (public.is_transaction_party(id) or public.is_admin());

-- ─── transaction_tasks ───────────────────────────────────────────────────────
create table public.transaction_tasks (
  id                uuid primary key default uuid_generate_v4(),
  transaction_id    uuid not null references public.transactions(id) on delete cascade,
  title             text not null,
  assigned_party_id uuid references public.party_roles(id),
  status            text not null default 'open' check (status in ('open', 'in_progress', 'done', 'skipped')),
  due_date          date,
  order_index       smallint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_transaction_tasks_transaction_id on public.transaction_tasks(transaction_id, order_index);

create trigger trg_transaction_tasks_set_updated_at
  before update on public.transaction_tasks
  for each row execute procedure public.set_updated_at();

alter table public.transaction_tasks enable row level security;

create policy "transaction_tasks_select"
  on public.transaction_tasks for select
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "transaction_tasks_insert"
  on public.transaction_tasks for insert
  with check (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "transaction_tasks_update"
  on public.transaction_tasks for update
  using (public.is_transaction_party(transaction_id) or public.is_admin());

-- ─── Default checklist seeding ───────────────────────────────────────────────
-- Re-defines the two transaction-creating functions from migration 013 to
-- also seed a starter checklist. Task titles are deliberately generic
-- organizational labels, not legal claims about what's required to close.
create or replace function public.accept_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_transaction_id uuid;
begin
  select listing_id into v_listing_id from public.offers where id = p_offer_id;
  if v_listing_id is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;

  update public.offers set status = 'accepted' where id = p_offer_id;

  update public.listings set lifecycle_status = 'under_contract' where id = v_listing_id;

  insert into public.transactions (listing_id, source_type, source_id)
  values (v_listing_id, 'offer', p_offer_id)
  returning id into v_transaction_id;

  insert into public.transaction_tasks (transaction_id, title, order_index)
  values
    (v_transaction_id, 'Sign purchase agreement', 1),
    (v_transaction_id, 'Arrange payment', 2),
    (v_transaction_id, 'Finalize closing', 3);

  return v_transaction_id;
end;
$$;

create or replace function public.approve_rental_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_transaction_id uuid;
begin
  select listing_id into v_listing_id from public.rental_applications where id = p_application_id;
  if v_listing_id is null then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  update public.rental_applications set status = 'approved' where id = p_application_id;

  update public.listings set lifecycle_status = 'under_contract' where id = v_listing_id;

  insert into public.transactions (listing_id, source_type, source_id)
  values (v_listing_id, 'rental_application', p_application_id)
  returning id into v_transaction_id;

  insert into public.transaction_tasks (transaction_id, title, order_index)
  values
    (v_transaction_id, 'Sign lease agreement', 1),
    (v_transaction_id, 'Arrange security deposit', 2),
    (v_transaction_id, 'Confirm move-in date', 3);

  return v_transaction_id;
end;
$$;

-- >>> legacy-platform/migrations/015_documents.sql

-- Milestone 8a: transaction documents and e-signature tracking.
--
-- E-signature is genuinely mocked — no real provider is integrated or
-- chosen. `envelope_provider` is always 'mock'; `lib/esign/` documents what
-- a real provider would need to implement. Signing state is per-signer
-- (`document_signers`), never a single `signed = true` boolean, and the
-- document's aggregate `envelope_status` is only ever derived from those
-- rows by the RPCs below — never set directly by a client update for the
-- signature-progress values.
--
-- External file storage is not provisioned by this schema. Document metadata
-- and signature state live in Postgres; binary upload/download must be wired
-- to a separate storage provider before document files can be transferred.

create type document_envelope_status as enum (
  'not_started', 'draft', 'sent', 'partially_signed', 'completed', 'declined', 'voided'
);

create table public.documents (
  id                uuid primary key default uuid_generate_v4(),
  transaction_id    uuid not null references public.transactions(id) on delete cascade,
  title             text not null,
  doc_type          text not null default 'other'
                       check (doc_type in ('agreement', 'disclosure', 'lease', 'addendum', 'other')),
  storage_path      text,
  uploaded_by       uuid not null references public.profiles(id),
  envelope_provider text not null default 'mock',
  envelope_id       text,
  envelope_status   document_envelope_status not null default 'not_started',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.document_signers (
  id             uuid primary key default uuid_generate_v4(),
  document_id    uuid not null references public.documents(id) on delete cascade,
  party_role_id  uuid not null references public.party_roles(id),
  status         text not null default 'pending' check (status in ('pending', 'signed', 'declined')),
  signed_at      timestamptz,
  order_index    smallint not null default 0
);

create index idx_documents_transaction_id on public.documents(transaction_id);
create index idx_document_signers_document_id on public.document_signers(document_id);

create trigger trg_documents_set_updated_at
  before update on public.documents
  for each row execute procedure public.set_updated_at();

alter table public.documents enable row level security;
alter table public.document_signers enable row level security;

create policy "documents_select"
  on public.documents for select
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "documents_insert"
  on public.documents for insert
  with check (
    auth.uid() = uploaded_by
    and (public.is_transaction_party(transaction_id) or public.is_admin())
  );

create policy "documents_update"
  on public.documents for update
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create or replace function public.is_document_signer(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.document_signers ds
    join public.party_roles pr on pr.id = ds.party_role_id
    where ds.document_id = p_document_id and pr.profile_id = auth.uid()
  );
$$;

create policy "document_signers_select"
  on public.document_signers for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.documents d
      where d.id = document_signers.document_id and public.is_transaction_party(d.transaction_id)
    )
  );

-- No INSERT/UPDATE policy on document_signers — rows are only created and
-- advanced via the RPCs below.

-- ─── Envelope transition graph ──────────────────────────────────────────────
-- not_started -> sent (uploader sends for signature)
-- sent -> partially_signed | completed (derived from signer progress)
-- sent | partially_signed -> declined (any signer declines)
-- sent | partially_signed -> voided (uploader/admin cancels)
create or replace function public.is_valid_document_transition(
  p_old document_envelope_status, p_new document_envelope_status
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_old = p_new or (p_old, p_new) in (
    ('not_started', 'sent'),
    ('sent', 'partially_signed'),
    ('sent', 'completed'),
    ('sent', 'declined'),
    ('sent', 'voided'),
    ('partially_signed', 'completed'),
    ('partially_signed', 'declined'),
    ('partially_signed', 'voided')
  );
$$;

create or replace function public.enforce_document_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.transaction_id is distinct from old.transaction_id
    or new.uploaded_by is distinct from old.uploaded_by
  then
    raise exception 'transaction_id and uploaded_by cannot be changed'
      using errcode = '42501';
  end if;

  if new.envelope_status is distinct from old.envelope_status then
    if not public.is_valid_document_transition(old.envelope_status, new.envelope_status) then
      raise exception 'Invalid envelope status transition: % -> %', old.envelope_status, new.envelope_status
        using errcode = '22023';
    end if;

    if new.envelope_status = 'sent' then
      if not (auth.uid() = old.uploaded_by or public.is_admin()) then
        raise exception 'Only the uploader may send a document for signature'
          using errcode = '42501';
      end if;
    elsif new.envelope_status in ('partially_signed', 'completed') then
      if not (public.is_document_signer(old.id) or public.is_admin()) then
        raise exception 'Only a signer may progress this document toward completion'
          using errcode = '42501';
      end if;
    elsif new.envelope_status = 'declined' then
      if not (public.is_document_signer(old.id) or public.is_admin()) then
        raise exception 'Only a signer may decline a document' using errcode = '42501';
      end if;
    elsif new.envelope_status = 'voided' then
      if not (auth.uid() = old.uploaded_by or public.is_admin()) then
        raise exception 'Only the uploader may void a document' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_documents_transition
  before update on public.documents
  for each row execute procedure public.enforce_document_transition();

-- ─── RPCs ────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER for the same reason as the offer/application RPCs: each
-- performs a coordinated multi-row write (creating signer rows, or updating
-- both a signer and the parent document's derived status) that isn't
-- expressible as a single RLS-gated statement. The guard trigger above still
-- fires on every UPDATE these perform and re-validates the transition and
-- actor, so authorization is not duplicated.
create or replace function public.send_document_for_signature(p_document_id uuid, p_envelope_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction_id uuid;
  v_uploaded_by    uuid;
  v_listing_id     uuid;
  v_source_type    text;
  v_source_id      uuid;
  v_order          smallint := 1;
begin
  select transaction_id, uploaded_by into v_transaction_id, v_uploaded_by
  from public.documents where id = p_document_id;

  if v_transaction_id is null then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  if auth.uid() is distinct from v_uploaded_by and not public.is_admin() then
    raise exception 'Only the uploader may send a document for signature'
      using errcode = '42501';
  end if;

  select listing_id, source_type, source_id into v_listing_id, v_source_type, v_source_id
  from public.transactions where id = v_transaction_id;

  if v_source_type = 'offer' then
    insert into public.document_signers (document_id, party_role_id, order_index)
    select p_document_id, party_id, v_order + row_number() over () - 1
    from (
      select buyer_party_id as party_id from public.offers where id = v_source_id
      union all
      select seller_party_id from public.offers where id = v_source_id
    ) parties;
  else
    insert into public.document_signers (document_id, party_role_id, order_index)
    select p_document_id, party_id, v_order + row_number() over () - 1
    from (
      select applicant_party_id as party_id from public.rental_applications where id = v_source_id
      union all
      select id from public.party_roles where listing_id = v_listing_id and role = 'landlord'
    ) parties;
  end if;

  update public.documents
  set envelope_status = 'sent', envelope_id = p_envelope_id
  where id = p_document_id;
end;
$$;

create or replace function public.sign_document(p_document_signer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id  uuid;
  v_profile_id   uuid;
  v_pending_left int;
begin
  select ds.document_id, pr.profile_id into v_document_id, v_profile_id
  from public.document_signers ds
  join public.party_roles pr on pr.id = ds.party_role_id
  where ds.id = p_document_signer_id;

  if v_document_id is null then
    raise exception 'Signer record not found' using errcode = 'P0002';
  end if;
  if auth.uid() is distinct from v_profile_id and not public.is_admin() then
    raise exception 'Only the assigned signer may sign' using errcode = '42501';
  end if;

  update public.document_signers
  set status = 'signed', signed_at = now()
  where id = p_document_signer_id and status = 'pending';

  select count(*) into v_pending_left
  from public.document_signers
  where document_id = v_document_id and status = 'pending';

  if v_pending_left = 0 then
    update public.documents set envelope_status = 'completed' where id = v_document_id;
  else
    update public.documents set envelope_status = 'partially_signed' where id = v_document_id;
  end if;
end;
$$;

create or replace function public.decline_document(p_document_signer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_profile_id  uuid;
begin
  select ds.document_id, pr.profile_id into v_document_id, v_profile_id
  from public.document_signers ds
  join public.party_roles pr on pr.id = ds.party_role_id
  where ds.id = p_document_signer_id;

  if v_document_id is null then
    raise exception 'Signer record not found' using errcode = 'P0002';
  end if;
  if auth.uid() is distinct from v_profile_id and not public.is_admin() then
    raise exception 'Only the assigned signer may decline' using errcode = '42501';
  end if;

  update public.document_signers set status = 'declined' where id = p_document_signer_id;
  update public.documents set envelope_status = 'declined' where id = v_document_id;
end;
$$;

create or replace function public.void_document(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uploaded_by uuid;
begin
  select uploaded_by into v_uploaded_by from public.documents where id = p_document_id;
  if v_uploaded_by is null then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  if auth.uid() is distinct from v_uploaded_by and not public.is_admin() then
    raise exception 'Only the uploader may void a document' using errcode = '42501';
  end if;

  update public.documents set envelope_status = 'voided' where id = p_document_id;
end;
$$;

grant execute on function public.send_document_for_signature(uuid, text) to authenticated;
grant execute on function public.sign_document(uuid) to authenticated;
grant execute on function public.decline_document(uuid) to authenticated;
grant execute on function public.void_document(uuid) to authenticated;

-- >>> legacy-platform/migrations/016_payments_ledger_commission.sql

-- Milestone 8b: payment tracking, a double-entry ledger, commission
-- configuration, and a regional-rules table.
--
-- IMPORTANT — what this is and isn't: `STRIPE_SECRET_KEY` is already
-- configured for this app's SaaS plan billing, and that same Stripe account
-- is reused here to collect a one-time deposit payment via Stripe Checkout
-- (`mode: 'payment'`) — this is a real, working Stripe integration, not a
-- mock. What is NOT configured is Stripe Connect: without it, a deposit
-- collected here lands in the platform's own Stripe balance, with no
-- automated way to pay it out to the seller/landlord. `transfers`/`payouts`
-- below are schema-ready but functionally inert until Connect is activated
-- (see README). Copy anywhere in the app referring to held funds must say
-- "payment held by Stripe" — never "escrow" — since no legally-recognized
-- escrow/custodian integration exists.
--
-- `transaction_status`/`contract_status`/`payment_status`/`payout_status`/
-- `dispute_status` remain independent fields (already true since Milestone
-- 6) — nothing here collapses them into each other. A Stripe dispute
-- updates `dispute_status` only; it never silently flips
-- `transactions.status` to cancelled.

create table public.payment_intents (
  id                 uuid primary key default uuid_generate_v4(),
  transaction_id     uuid not null references public.transactions(id) on delete cascade,
  provider           text not null default 'stripe',
  provider_intent_id text,
  purpose            text not null check (purpose in ('deposit', 'rent_payment', 'commission', 'other')),
  amount             numeric(15, 2) not null check (amount > 0),
  currency           text not null default 'usd',
  status             text not null default 'requires_payment_method'
                        check (status in (
                          'requires_payment_method', 'requires_confirmation', 'requires_action',
                          'processing', 'requires_capture', 'succeeded', 'canceled'
                        )),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.payments (
  id                uuid primary key default uuid_generate_v4(),
  payment_intent_id uuid not null references public.payment_intents(id) on delete cascade,
  amount            numeric(15, 2) not null,
  captured_at       timestamptz,
  held_by           text not null default 'stripe',
  released_at       timestamptz,
  created_at        timestamptz not null default now()
);

create table public.refunds (
  id                 uuid primary key default uuid_generate_v4(),
  payment_id         uuid not null references public.payments(id) on delete cascade,
  amount             numeric(15, 2) not null check (amount > 0),
  reason             text,
  provider_refund_id text,
  status             text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at         timestamptz not null default now()
);

-- Schema-ready for when Stripe Connect is activated — not written to by
-- any code path today.
create table public.transfers (
  id                   uuid primary key default uuid_generate_v4(),
  transaction_id       uuid not null references public.transactions(id) on delete cascade,
  payee_party_id       uuid not null references public.party_roles(id),
  amount               numeric(15, 2) not null check (amount > 0),
  provider_transfer_id text,
  status               text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'reversed')),
  created_at           timestamptz not null default now()
);

create table public.payouts (
  id                 uuid primary key default uuid_generate_v4(),
  transfer_id        uuid not null references public.transfers(id) on delete cascade,
  provider_payout_id text,
  status             text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  arrived_at         timestamptz,
  created_at         timestamptz not null default now()
);

create table public.disputes (
  id                 uuid primary key default uuid_generate_v4(),
  payment_id         uuid not null references public.payments(id) on delete cascade,
  provider_dispute_id text,
  reason             text,
  status             text not null default 'open' check (status in ('open', 'won', 'lost', 'resolved')),
  opened_at          timestamptz not null default now(),
  resolved_at        timestamptz
);

-- Append-only double-entry ledger — the source of financial truth. Every
-- economic event posts a balanced debit/credit pair sharing an
-- `entry_group_id`; nothing here is ever updated or deleted.
create table public.ledger_entries (
  id                  bigserial primary key,
  transaction_id      uuid not null references public.transactions(id) on delete cascade,
  entry_group_id      uuid not null,
  account             text not null,
  direction           text not null check (direction in ('debit', 'credit')),
  amount              numeric(15, 2) not null check (amount > 0),
  currency            text not null default 'usd',
  related_payment_id  uuid references public.payments(id),
  related_transfer_id uuid references public.transfers(id),
  memo                text,
  created_at          timestamptz not null default now()
);

-- Commission terms are looked up here but the *applied* rate is copied onto
-- `transactions` at calculation time (columns added below) so historical
-- transactions never change if this config changes later.
create table public.commission_configs (
  id              uuid primary key default uuid_generate_v4(),
  scope           text not null check (scope in ('platform_default', 'agent_override')),
  agent_profile_id uuid references public.profiles(id),
  listing_type    listing_type,
  rate_percent    numeric(5, 2),
  flat_fee        numeric(15, 2),
  effective_from  date not null default current_date,
  effective_to    date,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  check (scope = 'platform_default' or agent_profile_id is not null)
);

create table public.regional_rules (
  id           uuid primary key default uuid_generate_v4(),
  region_code  text not null default 'LB',
  rule_key     text not null,
  rule_value   jsonb not null,
  description  text,
  unique (region_code, rule_key)
);

alter table public.transactions
  add column commission_rate_percent numeric(5, 2),
  add column commission_amount numeric(15, 2);

create index idx_payment_intents_transaction_id on public.payment_intents(transaction_id);
create index idx_payments_payment_intent_id on public.payments(payment_intent_id);
create index idx_refunds_payment_id on public.refunds(payment_id);
create index idx_transfers_transaction_id on public.transfers(transaction_id);
create index idx_payouts_transfer_id on public.payouts(transfer_id);
create index idx_disputes_payment_id on public.disputes(payment_id);
create index idx_ledger_entries_transaction_id on public.ledger_entries(transaction_id, entry_group_id);

create trigger trg_payment_intents_set_updated_at
  before update on public.payment_intents
  for each row execute procedure public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Financial writes never go through client-facing RLS insert/update policies.
-- Every write here goes through a trusted Server Action
-- (createDepositCheckoutSessionAction, etc.) or the Stripe webhook handler,
-- each of which performs its own explicit authorization check before writing,
-- mirroring the audit_log/party_roles pattern.
alter table public.payment_intents enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.transfers enable row level security;
alter table public.payouts enable row level security;
alter table public.disputes enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.commission_configs enable row level security;
alter table public.regional_rules enable row level security;

create policy "payment_intents_select"
  on public.payment_intents for select
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "payments_select"
  on public.payments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.payment_intents pi
      where pi.id = payments.payment_intent_id and public.is_transaction_party(pi.transaction_id)
    )
  );

create policy "refunds_select"
  on public.refunds for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.payments p
      join public.payment_intents pi on pi.id = p.payment_intent_id
      where p.id = refunds.payment_id and public.is_transaction_party(pi.transaction_id)
    )
  );

create policy "transfers_select"
  on public.transfers for select
  using (public.is_transaction_party(transaction_id) or public.is_admin());

create policy "payouts_select"
  on public.payouts for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.transfers t
      where t.id = payouts.transfer_id and public.is_transaction_party(t.transaction_id)
    )
  );

create policy "disputes_select"
  on public.disputes for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.payments p
      join public.payment_intents pi on pi.id = p.payment_intent_id
      where p.id = disputes.payment_id and public.is_transaction_party(pi.transaction_id)
    )
  );

-- The ledger and commission configuration are internal financial records —
-- admin-only, same as audit_log.
create policy "ledger_entries_select_admin"
  on public.ledger_entries for select
  using (public.is_admin());

create policy "commission_configs_select_admin"
  on public.commission_configs for select
  using (public.is_admin());

-- Regional rules are non-sensitive configuration — publicly readable so the
-- UI can surface rule-derived copy (e.g. minimum deposit) without an extra
-- privileged round-trip.
create policy "regional_rules_select_all"
  on public.regional_rules for select
  using (true);

-- ─── Seed: Lebanon (LB) defaults ────────────────────────────────────────────
-- Conservative, non-binding placeholders — NOT a legal compliance claim.
-- Every value here needs professional legal review before being treated as
-- an actual policy.
insert into public.regional_rules (region_code, rule_key, rule_value, description) values
  ('LB', 'deposit_min_percent', '5', 'TODO: legal review. Suggested floor for a sale deposit, as a percent of offer price.'),
  ('LB', 'deposit_max_percent', '20', 'TODO: legal review. Suggested ceiling for a sale deposit, as a percent of offer price.'),
  ('LB', 'default_commission_rate_percent', '2.5', 'TODO: business/legal review. Platform default commission rate absent an agent-specific override.')
on conflict (region_code, rule_key) do nothing;

insert into public.commission_configs (scope, rate_percent, created_at)
values ('platform_default', 2.5, now());

-- >>> legacy-platform/migrations/017_decision_support_and_notifications.sql

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
-- that table — in this single-process, synchronous Next.js/legacy platform
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
-- by trusted server-side service-layer code (see
-- services/notification.service.ts), matching audit_log/party_roles.

-- >>> legacy-platform/migrations/018_grant_default_privileges.sql

-- Fixes a foundational gap found by actually running every migration
-- against a live (local) Postgres instance for the first time this
-- session: `anonymous` and `authenticated` had zero
-- SELECT/INSERT/UPDATE/DELETE grants on any table in this schema — only
-- TRUNCATE/REFERENCES/TRIGGER. Table-level GRANTs are the "can this role
-- touch this table at all" gate; Row Level Security policies (already
-- enabled on every table since 001_init.sql) are the "which rows" gate —
-- both are required, and only the second existed. Hosted legacy platform projects
-- provision these grants automatically as part of the platform's own
-- project bootstrap, entirely separate from this repo's migrations; this
-- CLI-managed local instance did not reproduce that step, so this
-- migration makes the grants explicit and self-contained instead of
-- relying on undocumented platform behavior that may or may not be present
-- in every environment this project is deployed to.
--
-- `anon` gets SELECT only — no anonymous action in this app ever needs to
-- write, and RLS policies for INSERT/UPDATE that check `auth.uid()` would
-- reject an anonymous session anyway, but the base grant is scoped to match
-- intent rather than relying on RLS alone for that boundary.

grant usage on schema public to anonymous, authenticated;

grant select on all tables in schema public to anonymous;
grant select, insert, update, delete on all tables in schema public to authenticated;

grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public grant select on tables to anonymous;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

-- >>> legacy-platform/migrations/019_analytics_funnel_and_audit.sql

-- Milestone 11: analytics funnel + admin audit-log viewer.
--
-- `get_analytics_summary()` replaces six separate round trips in
-- services/analytics.service.ts's getAnalyticsSummary() — and fixes a
-- live bug found while wiring this up: that function was still querying
-- `properties.status` / `properties.is_featured` / `properties.is_sold`,
-- columns that moved to `listings` (as `moderation_status`,
-- `is_featured`, `lifecycle_status`) back in migration 005. Since
-- legacy-platform-js doesn't type-check column names against the live schema,
-- those queries didn't fail loudly — they just silently returned zero
-- counts for every card except totalUsers/totalProperties. This had
-- never been caught because the admin analytics page had never been
-- exercised against a live database until this session.
--
-- `get_transaction_funnel()` is the new funnel the milestone asks for:
-- listings -> viewings -> offers -> transactions -> closed. One query,
-- five subquery counts, no N+1.

create or replace function public.get_analytics_summary()
returns table(
  total_users        bigint,
  total_listings     bigint,
  approved_listings  bigint,
  pending_listings   bigint,
  featured_listings  bigint,
  closed_listings    bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.listings),
    (select count(*) from public.listings where moderation_status = 'approved'),
    (select count(*) from public.listings where moderation_status = 'pending'),
    (select count(*) from public.listings where is_featured = true),
    (select count(*) from public.listings where lifecycle_status in ('sold', 'leased'));
$$;

create or replace function public.get_transaction_funnel()
returns table(
  listings_count              bigint,
  viewings_count               bigint,
  offers_count                  bigint,
  transactions_count            bigint,
  closed_transactions_count     bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*) from public.listings where moderation_status = 'approved'),
    (select count(*) from public.viewings),
    (select count(*) from public.offers),
    (select count(*) from public.transactions),
    (select count(*) from public.transactions where status = 'completed');
$$;

revoke all on function public.get_analytics_summary() from public;
revoke all on function public.get_transaction_funnel() from public;

-- Admin analytics functions are intentionally not granted to Data API roles.
