-- Milestone 11: analytics funnel + admin audit-log viewer.
--
-- `get_analytics_summary()` replaces six separate round trips in
-- services/analytics.service.ts's getAnalyticsSummary() — and fixes a
-- live bug found while wiring this up: that function was still querying
-- `properties.status` / `properties.is_featured` / `properties.is_sold`,
-- columns that moved to `listings` (as `moderation_status`,
-- `is_featured`, `lifecycle_status`) back in migration 005. Since
-- supabase-js doesn't type-check column names against the live schema,
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

grant execute on function public.get_analytics_summary() to service_role;
grant execute on function public.get_transaction_funnel() to service_role;
