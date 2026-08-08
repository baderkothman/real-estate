'use client'

import {
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX,
  IconStar,
  IconStarOff,
  IconTrash,
} from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  adminPropertyAction,
  getAdminPropertiesAction,
} from '@/app/actions/properties'
import { Button } from '@/components/ui/button'
import { cn, formatPrice, formatRelativeDate } from '@/lib/utils'
import type { PaginatedResult, Property } from '@/types'

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'featured', label: 'Featured' },
]

type AdminPropertyActionName =
  | 'approve'
  | 'reject'
  | 'feature'
  | 'unfeature'
  | 'delete'

function AdminPropertyRow({
  property,
  actionLoading,
  featDaysValue,
  onFeatDaysChange,
  onAction,
}: {
  property: Property
  actionLoading: string | null
  featDaysValue: string
  onFeatDaysChange: (value: string) => void
  onAction: (action: AdminPropertyActionName, extra?: { days?: number }) => void
}) {
  return (
    <tr className="hover:bg-[#faf7eb]/50 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-14 rounded overflow-hidden shrink-0">
            <Image
              src={
                property.coverImage ??
                `https://picsum.photos/seed/${property.id}/400/300`
              }
              alt={property.title}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
          <div>
            <Link
              href={`/properties/${property.id}`}
              className="text-[#181411] hover:text-[#a34702] transition-colors line-clamp-1 text-sm"
            >
              {property.title}
            </Link>
            <p className="text-xs text-[#5f554d]">{property.city}</p>
          </div>
        </div>
      </td>
      <td className="p-4 hidden md:table-cell">
        <span className="text-[#5f554d] text-xs">{property.ownerName}</span>
      </td>
      <td className="p-4 hidden sm:table-cell">
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full border',
            property.status === 'approved' &&
              'bg-emerald-50 border-emerald-200 text-emerald-700',
            property.status === 'pending' &&
              'bg-amber-50 border-amber-200 text-amber-700',
            property.status === 'rejected' &&
              'bg-red-50 border-red-200 text-red-700'
          )}
        >
          {property.status}
          {property.isFeatured && ' ★'}
        </span>
      </td>
      <td className="p-4 hidden lg:table-cell">
        <span className="font-mono text-xs text-[#a34702]">
          {formatPrice(property.price)}
        </span>
      </td>
      <td className="p-4 hidden xl:table-cell">
        <span className="text-xs text-[#5f554d]">
          {formatRelativeDate(property.createdAt)}
        </span>
      </td>
      <td className="p-4">
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {property.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => onAction('approve')}
                disabled={actionLoading === `${property.id}approve`}
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                title="Approve"
                aria-label={`Approve "${property.title}"`}
              >
                <IconCircleCheck className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onAction('reject')}
                disabled={actionLoading === `${property.id}reject`}
                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                title="Reject"
                aria-label={`Reject "${property.title}"`}
              >
                <IconCircleX className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {property.status === 'approved' && !property.isFeatured && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Days"
                value={featDaysValue}
                onChange={(e) => onFeatDaysChange(e.target.value)}
                className="w-14 h-7 rounded-md bg-white border border-[rgba(34,24,18,0.14)] text-[#181411] text-xs px-2 focus:outline-none focus:border-[#fa6b05]"
                min={1}
                max={365}
                aria-label={`Days to feature "${property.title}"`}
              />
              <button
                type="button"
                onClick={() =>
                  onAction('feature', {
                    days: parseInt(featDaysValue || '30', 10),
                  })
                }
                className="p-1.5 rounded-lg bg-[#fef0e6] text-[#a34702] hover:bg-[#fa6b05]/15 transition-colors"
                title="Feature"
                aria-label={`Feature "${property.title}"`}
              >
                <IconStar className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {property.isFeatured && (
            <button
              type="button"
              onClick={() => onAction('unfeature')}
              className="p-1.5 rounded-lg bg-[#faf7eb] text-[#5f554d] hover:bg-[rgba(34,24,18,0.08)] transition-colors"
              title="Unfeature"
              aria-label={`Unfeature "${property.title}"`}
            >
              <IconStarOff className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this property?')) {
                onAction('delete')
              }
            }}
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            title="Delete"
            aria-label={`Delete "${property.title}"`}
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function AdminPropertiesPage() {
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PaginatedResult<Property> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [featDays, setFeatDays] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchProperties = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        ...(status !== 'all' ? { status } : {}),
      })
      const data = await getAdminPropertiesAction({
        page: Number(params.get('page')),
        pageSize: Number(params.get('pageSize')),
        status: params.get('status') ?? 'all',
      })
      if (data.result) {
        setResult(data.result)
      } else if (data.error) {
        console.error(data.error)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [status, page])

  useEffect(() => {
    void fetchProperties()
  }, [fetchProperties])

  const adminAction = async (
    propertyId: string,
    action: AdminPropertyActionName,
    extra?: { days?: number }
  ) => {
    setActionLoading(propertyId + action)
    try {
      const result = await adminPropertyAction(propertyId, { action, ...extra })
      if (result?.error) console.error(result.error)
      await fetchProperties()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-[#181411] mb-6 tracking-wide">
        Property Management
      </h2>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-[rgba(34,24,18,0.08)] pb-4">
        {statusTabs.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => {
              setStatus(tab.value)
              setPage(1)
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              status === tab.value
                ? 'bg-[#a34702] text-white shadow-[0_2px_8px_rgba(250,107,5,0.25)]'
                : 'text-[#5f554d] hover:text-[#181411] hover:bg-white hover:shadow-[0_2px_8px_rgba(24,20,17,0.06)]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white border border-[rgba(34,24,18,0.08)] rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-[20px] border border-[rgba(34,24,18,0.08)] bg-white shadow-[0_6px_20px_rgba(24,20,17,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb] text-xs text-[#5f554d]">
                    <th className="text-left p-4 font-normal">Property</th>
                    <th className="text-left p-4 font-normal hidden md:table-cell">
                      Owner
                    </th>
                    <th className="text-left p-4 font-normal hidden sm:table-cell">
                      Status
                    </th>
                    <th className="text-left p-4 font-normal hidden lg:table-cell">
                      Price
                    </th>
                    <th className="text-left p-4 font-normal hidden xl:table-cell">
                      Date
                    </th>
                    <th className="text-right p-4 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(34,24,18,0.05)]">
                  {result?.data.map((property) => (
                    <AdminPropertyRow
                      key={property.id}
                      property={property}
                      actionLoading={actionLoading}
                      featDaysValue={featDays[property.id] ?? ''}
                      onFeatDaysChange={(value) =>
                        setFeatDays((prev) => ({
                          ...prev,
                          [property.id]: value,
                        }))
                      }
                      onAction={(action, extra) =>
                        void adminAction(property.id, action, extra)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {result && result.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-[#5f554d]">
                Page {page} of {result.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= result.totalPages}
                aria-label="Next page"
              >
                <IconChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
