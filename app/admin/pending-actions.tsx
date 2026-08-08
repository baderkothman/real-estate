'use client'

import { IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { adminPropertyAction } from '@/app/actions/properties'
import { formatRelativeDate } from '@/lib/utils'
import type { Property } from '@/types'

interface AdminPendingActionsProps {
  properties: Property[]
}

export function AdminPendingActions({ properties }: AdminPendingActionsProps) {
  const router = useRouter()

  const doAction = async (propertyId: string, action: 'approve' | 'reject') => {
    await adminPropertyAction(propertyId, { action })
    router.refresh()
  }

  return (
    <div className="divide-y divide-[rgba(34,24,18,0.06)]">
      {properties.map((property) => (
        <div key={property.id} className="flex items-center gap-3 px-5 py-3">
          <div className="relative h-12 w-16 rounded-lg overflow-hidden shrink-0">
            <Image
              src={
                property.coverImage ??
                property.images[0] ??
                `https://picsum.photos/seed/${property.id}/400/300`
              }
              alt={property.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#181411] truncate">{property.title}</p>
            <p className="text-xs text-[#5f554d]">
              {property.city} &middot; {formatRelativeDate(property.createdAt)}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              title="Approve"
              aria-label={`Approve "${property.title}"`}
              onClick={() => void doAction(property.id, 'approve')}
            >
              <IconCircleCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              title="Reject"
              aria-label={`Reject "${property.title}"`}
              onClick={() => void doAction(property.id, 'reject')}
            >
              <IconCircleX className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
