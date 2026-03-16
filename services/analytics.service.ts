import { mockProperties } from '@/data/mock-properties'
import { mockUsers } from '@/data/mock-users'
import type { AnalyticsSummary } from '@/types'

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const totalUsers = mockUsers.length
  const totalProperties = mockProperties.length
  const approvedProperties = mockProperties.filter(
    (p) => p.status === 'approved'
  ).length
  const pendingProperties = mockProperties.filter(
    (p) => p.status === 'pending'
  ).length
  const featuredProperties = mockProperties.filter((p) => p.isFeatured).length
  const soldProperties = mockProperties.filter((p) => p.isSold).length

  return {
    totalUsers,
    totalProperties,
    approvedProperties,
    pendingProperties,
    featuredProperties,
    soldProperties,
  }
}

export async function getPropertiesByStatus(): Promise<
  Array<{ status: string; count: number }>
> {
  const statusCounts: Record<string, number> = {}
  mockProperties.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1
  })
  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }))
}

export async function getPropertiesByType(): Promise<
  Array<{ type: string; count: number }>
> {
  const typeCounts: Record<string, number> = {}
  mockProperties.forEach((p) => {
    const type = p.listingType === 'sale' ? 'For Sale' : 'For Rent'
    typeCounts[type] = (typeCounts[type] ?? 0) + 1
  })
  return Object.entries(typeCounts).map(([type, count]) => ({ type, count }))
}

export async function getTopCities(
  limit = 10
): Promise<Array<{ city: string; count: number }>> {
  const cityCounts: Record<string, number> = {}
  mockProperties
    .filter((p) => p.status === 'approved')
    .forEach((p) => {
      cityCounts[p.city] = (cityCounts[p.city] ?? 0) + 1
    })

  return Object.entries(cityCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([city, count]) => ({ city, count }))
}

export async function getUsersByPlan(): Promise<
  Array<{ plan: string; count: number }>
> {
  const planCounts: Record<string, number> = {}
  mockUsers.forEach((u) => {
    planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1
  })
  return Object.entries(planCounts).map(([plan, count]) => ({ plan, count }))
}
