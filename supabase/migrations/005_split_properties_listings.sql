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

grant execute on function public.get_properties_by_status() to service_role;
grant execute on function public.get_properties_by_type() to service_role;
grant execute on function public.get_top_cities(int) to service_role;
