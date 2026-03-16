import { createAdminClient } from '@/lib/supabase/admin'
import type { AnalyticsSummary } from '@/types'

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const admin = createAdminClient()

  const [
    { count: totalUsers },
    { count: totalProperties },
    { count: approvedProperties },
    { count: pendingProperties },
    { count: featuredProperties },
    { count: soldProperties },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('properties').select('*', { count: 'exact', head: true }),
    admin
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved'),
    admin
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('is_featured', true),
    admin
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('is_sold', true),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    totalProperties: totalProperties ?? 0,
    approvedProperties: approvedProperties ?? 0,
    pendingProperties: pendingProperties ?? 0,
    featuredProperties: featuredProperties ?? 0,
    soldProperties: soldProperties ?? 0,
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
