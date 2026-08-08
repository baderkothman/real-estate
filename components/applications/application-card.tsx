'use client'

import { IconArrowRight, IconMapPin } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  approveRentalApplicationAction,
  conditionallyApproveApplicationAction,
  markApplicationUnderReviewAction,
  rejectRentalApplicationAction,
  withdrawRentalApplicationAction,
} from '@/app/actions/applications'
import { Button } from '@/components/ui/button'
import { cn, formatPrice } from '@/lib/utils'
import type { RentalApplication } from '@/services/application.service'

const STATUS_STYLES: Record<RentalApplication['status'], string> = {
  submitted: 'bg-amber-50 border-amber-200 text-amber-700',
  under_review: 'bg-blue-50 border-blue-200 text-blue-700',
  approved: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  conditionally_approved: 'bg-violet-50 border-violet-200 text-violet-700',
  rejected: 'bg-red-50 border-red-200 text-red-700',
  withdrawn: 'bg-[#f5f0e8] border-[rgba(34,24,18,0.14)] text-[#5f554d]',
}

const STATUS_LABELS: Record<RentalApplication['status'], string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  conditionally_approved: 'Conditionally Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export function ApplicationCard({
  application,
  viewerRole,
  transactionId,
}: {
  application: RentalApplication
  viewerRole: 'landlord' | 'applicant'
  transactionId?: string
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const isReviewable =
    application.status === 'submitted' || application.status === 'under_review'

  return (
    <div className="p-4 rounded-xl bg-white border border-[rgba(34,24,18,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <Link
            href={`/properties/${application.listingId}`}
            className="font-display text-sm font-medium text-[#181411] hover:text-[#a34702] transition-colors"
          >
            {application.listingTitle ?? 'Listing'}
          </Link>
          {application.listingCity && (
            <div className="flex items-center gap-1 text-xs text-[#5f554d] mt-0.5">
              <IconMapPin className="h-3 w-3" />
              {application.listingCity}
            </div>
          )}
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
            STATUS_STYLES[application.status]
          )}
        >
          {STATUS_LABELS[application.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5f554d] mb-2">
        {application.monthlyIncome !== undefined && (
          <span>Income: {formatPrice(application.monthlyIncome)}/mo</span>
        )}
        {application.occupantsCount !== undefined && (
          <span>{application.occupantsCount} occupant(s)</span>
        )}
        <span>{application.hasPets ? 'Has pets' : 'No pets'}</span>
        {application.moveInDate && (
          <span>Move-in: {application.moveInDate}</span>
        )}
      </div>

      {application.notes && (
        <p className="text-xs text-[#5f554d] italic mb-2">
          &ldquo;{application.notes}&rdquo;
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 mb-2" role="alert">
          {error}
        </p>
      )}

      {application.status === 'approved' && transactionId && (
        <Link
          href={`/dashboard/transactions/${transactionId}`}
          className="inline-flex items-center gap-1 text-sm text-[#a34702] hover:underline mb-2"
        >
          View Transaction <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        {viewerRole === 'landlord' && isReviewable && (
          <>
            {application.status === 'submitted' && (
              <Button
                size="sm"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() =>
                  run(() =>
                    markApplicationUnderReviewAction(
                      application.id,
                      application.listingId
                    )
                  )
                }
              >
                Mark Under Review
              </Button>
            )}
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={() =>
                run(() =>
                  approveRentalApplicationAction(
                    application.id,
                    application.listingId
                  )
                )
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() =>
                run(() =>
                  conditionallyApproveApplicationAction(
                    application.id,
                    application.listingId
                  )
                )
              }
            >
              Conditionally Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() =>
                run(() =>
                  rejectRentalApplicationAction(
                    application.id,
                    application.listingId
                  )
                )
              }
            >
              Reject
            </Button>
          </>
        )}
        {viewerRole === 'applicant' && isReviewable && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() =>
              run(() =>
                withdrawRentalApplicationAction(
                  application.id,
                  application.listingId
                )
              )
            }
          >
            Withdraw
          </Button>
        )}
      </div>
    </div>
  )
}
