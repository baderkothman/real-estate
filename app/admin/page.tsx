import {
  IconBuilding,
  IconCircleCheck,
  IconClock,
  IconCurrencyDollar,
  IconStar,
  IconUsers,
} from '@tabler/icons-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getAnalyticsSummary } from '@/services/analytics.service'
import { getAdminProperties } from '@/services/property.service'
import { getUsers } from '@/services/user.service'
import { AdminPendingActions } from './pending-actions'

export const metadata: Metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboardPage() {
  const [summary, pendingResult, recentUsers] = await Promise.all([
    getAnalyticsSummary(),
    getAdminProperties(1, 5, 'pending'),
    getUsers(undefined, undefined, 1, 5),
  ])

  const stats = [
    {
      label: 'Total Users',
      value: summary.totalUsers,
      icon: IconUsers,
      color: 'text-blue-500',
    },
    {
      label: 'Total Properties',
      value: summary.totalProperties,
      icon: IconBuilding,
      color: 'text-[#fa6b05]',
    },
    {
      label: 'Pending Review',
      value: summary.pendingProperties,
      icon: IconClock,
      color: 'text-amber-500',
    },
    {
      label: 'Featured',
      value: summary.featuredProperties,
      icon: IconStar,
      color: 'text-[#fa6b05]',
    },
    {
      label: 'Approved',
      value: summary.approvedProperties,
      icon: IconCircleCheck,
      color: 'text-emerald-500',
    },
    {
      label: 'Sold',
      value: summary.soldProperties,
      icon: IconCurrencyDollar,
      color: 'text-[#379579]',
    },
  ]

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-[#181411] mb-6 tracking-wide">
        Dashboard Overview
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-4 text-center hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_14px_40px_rgba(24,20,17,0.10)] transition-all duration-300"
          >
            <Icon className={cn('h-5 w-5 mx-auto mb-2', color)} />
            <div className="font-display text-2xl font-bold text-[#181411]">
              {value}
            </div>
            <div className="text-[10px] text-[#8b8178] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending properties (client component for actions) */}
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb]">
            <h3 className="font-display text-lg font-semibold text-[#181411]">
              Pending Review
            </h3>
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/properties?status=pending">View All</Link>
            </Button>
          </div>

          {pendingResult.data.length === 0 ? (
            <div className="p-8 text-center text-[#8b8178] text-sm">
              No pending properties
            </div>
          ) : (
            <AdminPendingActions properties={pendingResult.data} />
          )}
        </div>

        {/* Recent users */}
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb]">
            <h3 className="font-display text-lg font-semibold text-[#181411]">
              Recent Users
            </h3>
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/users">View All</Link>
            </Button>
          </div>

          <div className="divide-y divide-[rgba(34,24,18,0.06)]">
            {recentUsers.data.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-[#fef0e6] shrink-0">
                  {user.profileImage ? (
                    <Image
                      src={user.profileImage}
                      alt={user.name}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#fa6b05] text-xs font-bold">
                      {user.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#181411] truncate">{user.name}</p>
                  <p className="text-xs text-[#8b8178] truncate">
                    {user.email}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full border capitalize',
                    user.plan === 'agency' &&
                      'bg-[#ecf8f5] border-[#379579]/25 text-[#1c4a3c]',
                    user.plan === 'pro' &&
                      'bg-[#fef0e6] border-[#fa6b05]/25 text-[#964003]',
                    user.plan === 'free' &&
                      'bg-[#faf7eb] border-[rgba(34,24,18,0.12)] text-[#8b8178]'
                  )}
                >
                  {user.plan}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
