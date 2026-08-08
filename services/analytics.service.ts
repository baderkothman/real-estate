import { createAdminClient } from '@/lib/supabase/admin'
import type { AnalyticsSummary, TransactionFunnel } from '@/types'

interface AnalyticsSummaryRow {
  total_users: number
  total_listings: number
  approved_listings: number
  pending_listings: number
  featured_listings: number
  closed_listings: number
}

/**
 * Single round trip via `get_analytics_summary()` (migration 019) — this
 * used to be six separate queries against `properties`, three of which
 * (status/is_featured/is_sold) had silently returned zero ever since the
 * migration 005 properties/listings split moved those columns to
 * `listings`. Fixed as part of Milestone 11.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_analytics_summary').single()

  if (error || !data) {
    return {
      totalUsers: 0,
      totalProperties: 0,
      approvedProperties: 0,
      pendingProperties: 0,
      featuredProperties: 0,
      soldProperties: 0,
    }
  }

  const row = data as AnalyticsSummaryRow
  return {
    totalUsers: Number(row.total_users),
    totalProperties: Number(row.total_listings),
    approvedProperties: Number(row.approved_listings),
    pendingProperties: Number(row.pending_listings),
    featuredProperties: Number(row.featured_listings),
    soldProperties: Number(row.closed_listings),
  }
}

interface TransactionFunnelRow {
  listings_count: number
  viewings_count: number
  offers_count: number
  transactions_count: number
  closed_transactions_count: number
}

/**
 * The listings -> viewings -> offers -> transactions -> closed funnel,
 * via `get_transaction_funnel()` (migration 019) — one query, five
 * subquery counts, no N+1.
 */
export async function getTransactionFunnel(): Promise<TransactionFunnel> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_transaction_funnel').single()

  if (error || !data) {
    return {
      listingsCount: 0,
      viewingsCount: 0,
      offersCount: 0,
      transactionsCount: 0,
      closedTransactionsCount: 0,
    }
  }

  const row = data as TransactionFunnelRow
  return {
    listingsCount: Number(row.listings_count),
    viewingsCount: Number(row.viewings_count),
    offersCount: Number(row.offers_count),
    transactionsCount: Number(row.transactions_count),
    closedTransactionsCount: Number(row.closed_transactions_count),
  }
}

export async function getPropertiesByStatus(): Promise<
  Array<{ status: string; count: number }>
> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_properties_by_status')
  if (error || !data) return []
  return (data as Array<{ status: string; count: number }>).map((r) => ({
    status: r.status,
    count: Number(r.count),
  }))
}

export async function getPropertiesByType(): Promise<
  Array<{ type: string; count: number }>
> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_properties_by_type')
  if (error || !data) return []
  return (data as Array<{ type: string; count: number }>).map((r) => ({
    type: r.type === 'sale' ? 'For Sale' : 'For Rent',
    count: Number(r.count),
  }))
}

export async function getTopCities(
  limit = 10
): Promise<Array<{ city: string; count: number }>> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_top_cities', { p_limit: limit })
  if (error || !data) return []
  return (data as Array<{ city: string; count: number }>).map((r) => ({
    city: r.city,
    count: Number(r.count),
  }))
}

export async function getUsersByPlan(): Promise<
  Array<{ plan: string; count: number }>
> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_users_by_plan')
  if (error || !data) return []
  return (data as Array<{ plan: string; count: number }>).map((r) => ({
    plan: r.plan,
    count: Number(r.count),
  }))
}
