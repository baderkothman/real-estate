import type { Metadata } from 'next'
import { cn } from '@/lib/utils'
import {
  getAnalyticsSummary,
  getPropertiesByStatus,
  getPropertiesByType,
  getTopCities,
  getUsersByPlan,
} from '@/services/analytics.service'

export const metadata: Metadata = { title: 'Analytics' }

function BarChartRow({
  label,
  count,
  maxCount,
  colorClass,
}: {
  label: string
  count: number
  maxCount: number
  colorClass: string
}) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 text-sm text-[#5f554d] truncate text-right">
        {label}
      </div>
      <div className="flex-1 h-6 bg-[#faf7eb] rounded-md overflow-hidden">
        <div
          className={cn(
            'h-full rounded-md transition-all duration-700',
            colorClass
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-8 shrink-0 text-sm text-[#181411] text-right font-mono">
        {count}
      </div>
    </div>
  )
}

export default async function AdminAnalyticsPage() {
  const [summary, byStatus, byType, topCities, byPlan] = await Promise.all([
    getAnalyticsSummary(),
    getPropertiesByStatus(),
    getPropertiesByType(),
    getTopCities(10),
    getUsersByPlan(),
  ])

  const maxCityCount = topCities.reduce((m, c) => Math.max(m, c.count), 0)
  const maxStatusCount = byStatus.reduce((m, s) => Math.max(m, s.count), 0)
  const maxPlanCount = byPlan.reduce((m, p) => Math.max(m, p.count), 0)

  const statusColors: Record<string, string> = {
    approved: 'bg-emerald-500',
    pending: 'bg-amber-500',
    rejected: 'bg-red-500',
  }

  const planColors: Record<string, string> = {
    free: 'bg-[#8b8178]',
    pro: 'bg-[#fa6b05]',
    agency: 'bg-[#379579]',
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-[#181411] mb-6 tracking-wide">
        Analytics Overview
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {[
          { label: 'Total Users', value: summary.totalUsers },
          { label: 'Total Properties', value: summary.totalProperties },
          { label: 'Approved', value: summary.approvedProperties },
          { label: 'Pending', value: summary.pendingProperties },
          { label: 'Featured', value: summary.featuredProperties },
          { label: 'Sold', value: summary.soldProperties },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-4 text-center"
          >
            <div className="font-display text-3xl font-bold text-[#fa6b05]">
              {value}
            </div>
            <div className="text-[11px] text-[#8b8178] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Properties by status */}
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6">
          <h3 className="font-display text-lg font-semibold text-[#181411] mb-5">
            Properties by Status
          </h3>
          <div className="space-y-3">
            {byStatus.map(({ status, count }) => (
              <BarChartRow
                key={status}
                label={status.charAt(0).toUpperCase() + status.slice(1)}
                count={count}
                maxCount={maxStatusCount}
                colorClass={statusColors[status] ?? 'bg-[#8b8178]'}
              />
            ))}
          </div>
        </div>

        {/* Users by plan */}
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6">
          <h3 className="font-display text-lg font-semibold text-[#181411] mb-5">
            Users by Plan
          </h3>
          <div className="space-y-3">
            {byPlan.map(({ plan, count }) => (
              <BarChartRow
                key={plan}
                label={plan.charAt(0).toUpperCase() + plan.slice(1)}
                count={count}
                maxCount={maxPlanCount}
                colorClass={planColors[plan] ?? 'bg-[#8b8178]'}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-5 flex-wrap">
            {byPlan.map(({ plan, count }) => (
              <div key={plan} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-3 w-3 rounded-full',
                    planColors[plan] ?? 'bg-[#8b8178]'
                  )}
                />
                <span className="text-xs text-[#5f554d] capitalize">
                  {plan}
                </span>
                <span className="text-xs text-[#8b8178]">
                  (
                  {summary.totalUsers > 0
                    ? Math.round((count / summary.totalUsers) * 100)
                    : 0}
                  %)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Listing type */}
      <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 mb-8">
        <h3 className="font-display text-lg font-semibold text-[#181411] mb-5">
          Listing Types
        </h3>
        <div className="flex gap-6">
          {byType.map(({ type, count }) => {
            const pct =
              summary.totalProperties > 0
                ? Math.round((count / summary.totalProperties) * 100)
                : 0
            return (
              <div key={type} className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#5f554d]">{type}</span>
                  <span className="text-[#fa6b05] font-mono">{count}</span>
                </div>
                <div className="h-3 bg-[#faf7eb] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      type === 'For Sale' ? 'bg-blue-500' : 'bg-violet-500'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-[#8b8178] mt-1">{pct}% of total</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top cities */}
      <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6">
        <h3 className="font-display text-lg font-semibold text-[#181411] mb-5">
          Top Cities by Listings
        </h3>
        <div className="space-y-3">
          {topCities.map(({ city, count }, idx) => (
            <div key={city} className="flex items-center gap-3">
              <span className="w-5 text-xs text-[#8b8178] text-right shrink-0">
                {idx + 1}
              </span>
              <BarChartRow
                label={city}
                count={count}
                maxCount={maxCityCount}
                colorClass="bg-[#fa6b05]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
