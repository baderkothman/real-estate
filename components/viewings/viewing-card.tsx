'use client'

import { IconCalendar, IconMapPin } from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  cancelViewingAction,
  completeViewingAction,
  confirmViewingAction,
  noShowViewingAction,
  rescheduleViewingAction,
} from '@/app/actions/viewings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Viewing } from '@/services/viewing.service'

const STATUS_STYLES: Record<Viewing['status'], string> = {
  requested: 'bg-amber-50 border-amber-200 text-amber-700',
  confirmed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  completed: 'bg-blue-50 border-blue-200 text-blue-700',
  cancelled: 'bg-red-50 border-red-200 text-red-700',
  no_show: 'bg-[#f5f0e8] border-[rgba(34,24,18,0.14)] text-[#5f554d]',
}

const STATUS_LABELS: Record<Viewing['status'], string> = {
  requested: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

// Explicit locale AND timeZone — viewings are always Lebanon-local
// properties, and without a fixed timeZone this renders in whatever zone
// the server happens to run in vs. the visitor's browser zone, producing a
// hydration mismatch.
function formatSlot(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Beirut',
  })
}

export function ViewingCard({
  viewing,
  viewerRole,
}: {
  viewing: Viewing
  viewerRole: 'host' | 'requester'
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await fn()
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  const proposedSlot = viewing.requestedSlots[0]
  const otherPartyName =
    viewerRole === 'host' ? viewing.requesterName : viewing.hostName

  const submitReschedule = async () => {
    if (!newDate || !newTime) {
      setError('Choose a new date and time')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const start = new Date(`${newDate}T${newTime}`).toISOString()
      const result = await rescheduleViewingAction(viewing.id, [{ start }])
      if (result.error) {
        setError(result.error)
        return
      }
      setIsRescheduling(false)
      setNewDate('')
      setNewTime('')
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-white border border-[rgba(34,24,18,0.08)]">
      <div className="relative h-16 w-24 rounded-lg overflow-hidden shrink-0 hidden sm:block">
        <Image
          src={
            viewing.listingCoverImage ??
            `https://picsum.photos/seed/${viewing.listingId}/400/300`
          }
          alt={viewing.listingTitle ?? 'Listing'}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <Link
            href={`/properties/${viewing.listingId}`}
            className="font-display text-sm font-medium text-[#181411] hover:text-[#a34702] transition-colors"
          >
            {viewing.listingTitle ?? 'Listing'}
          </Link>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              STATUS_STYLES[viewing.status]
            )}
          >
            {STATUS_LABELS[viewing.status]}
          </span>
        </div>

        {viewing.listingCity && (
          <div className="flex items-center gap-1 text-xs text-[#5f554d] mb-1.5">
            <IconMapPin className="h-3 w-3" />
            {viewing.listingCity}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-[#5f554d]">
          <IconCalendar className="h-3.5 w-3.5 text-[#a34702]" />
          {viewing.status === 'confirmed' && viewing.confirmedStart ? (
            <span>
              Confirmed for {formatSlot(viewing.confirmedStart.toISOString())}
            </span>
          ) : proposedSlot ? (
            <span>Proposed: {formatSlot(proposedSlot.start)}</span>
          ) : (
            <span>No time proposed</span>
          )}
        </div>

        {otherPartyName && (
          <p className="text-xs text-[#5f554d] mt-1">
            {viewerRole === 'host' ? 'Requested by' : 'Host'}: {otherPartyName}
          </p>
        )}

        {viewing.locationNote && (
          <p className="text-xs text-[#5f554d] mt-1 italic">
            &ldquo;{viewing.locationNote}&rdquo;
          </p>
        )}

        {error && (
          <p className="text-xs text-red-600 mt-1.5" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          {viewerRole === 'host' &&
            viewing.status === 'requested' &&
            proposedSlot && (
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={() =>
                  run(() =>
                    confirmViewingAction(
                      viewing.id,
                      proposedSlot.start,
                      proposedSlot.end
                    )
                  )
                }
              >
                Confirm
              </Button>
            )}
          {viewerRole === 'host' && viewing.status === 'confirmed' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => run(() => completeViewingAction(viewing.id))}
              >
                Mark Completed
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => run(() => noShowViewingAction(viewing.id))}
              >
                Mark No-Show
              </Button>
            </>
          )}
          {viewing.status === 'confirmed' && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => setIsRescheduling((v) => !v)}
            >
              Propose New Time
            </Button>
          )}
          {(viewing.status === 'requested' ||
            viewing.status === 'confirmed') && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => run(() => cancelViewingAction(viewing.id))}
            >
              Cancel
            </Button>
          )}
        </div>

        {isRescheduling && (
          <div className="flex flex-wrap items-end gap-2 mt-3 pt-3 border-t border-[rgba(34,24,18,0.08)]">
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-auto"
            />
            <Input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-auto"
            />
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={submitReschedule}
            >
              Propose
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
