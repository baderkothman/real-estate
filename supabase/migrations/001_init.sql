-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type user_role as enum ('user', 'admin');
create type user_plan as enum ('free', 'pro', 'agency');
create type property_status as enum ('pending', 'approved', 'rejected');
create type listing_type as enum ('sale', 'rent');

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- profiles: one row per auth.users entry
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
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
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'user'),
    coalesce((new.raw_user_meta_data->>'plan')::user_plan, 'free')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
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
