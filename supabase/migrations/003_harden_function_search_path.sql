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

grant execute on function public.get_properties_by_status() to service_role;
grant execute on function public.get_properties_by_type() to service_role;
grant execute on function public.get_top_cities(int) to service_role;
grant execute on function public.get_users_by_plan() to service_role;
