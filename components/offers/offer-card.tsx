'use client'

import { IconArrowRight, IconMapPin } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  acceptOfferAction,
  counterOfferAction,
  rejectOfferAction,
  withdrawOfferAction,
} from '@/app/actions/offers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatPrice } from '@/lib/utils'
import type { Offer, OfferRevision } from '@/services/offer.service'

const STATUS_STYLES: Record<Offer['status'], string> = {
  submitted: 'bg-amber-50 border-amber-200 text-amber-700',
  countered: 'bg-blue-50 border-blue-200 text-blue-700',
  accepted: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  rejected: 'bg-red-50 border-red-200 text-red-700',
  withdrawn: 'bg-[#f5f0e8] border-[rgba(34,24,18,0.14)] text-[#5f554d]',
  expired: 'bg-[#f5f0e8] border-[rgba(34,24,18,0.14)] text-[#5f554d]',
}

export function OfferCard({
  offer,
  revisions,
  currentUserId,
  transactionId,
}: {
  offer: Offer
  revisions: OfferRevision[]
  currentUserId: string
  transactionId?: string
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCountering, setIsCountering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterMessage, setCounterMessage] = useState('')

  const isOpen = offer.status === 'submitted' || offer.status === 'countered'
  const lastProposer = offer.currentRevision?.proposedBy
  const isMyTurn = isOpen && lastProposer !== currentUserId

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

  const submitCounter = async () => {
    const price = Number(counterPrice)
    if (!price || price <= 0) {
      setError('Enter a valid counteroffer amount')
      return
    }
    await run(() =>
      counterOfferAction({
        offerId: offer.id,
        listingId: offer.listingId,
        price,
        message: counterMessage || undefined,
      })
    )
    setIsCountering(false)
    setCounterPrice('')
    setCounterMessage('')
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-[rgba(34,24,18,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <Link
            href={`/properties/${offer.listingId}`}
            className="font-display text-sm font-medium text-[#181411] hover:text-[#a34702] transition-colors"
          >
            {offer.listingTitle ?? 'Listing'}
          </Link>
          {offer.listingCity && (
            <div className="flex items-center gap-1 text-xs text-[#5f554d] mt-0.5">
              <IconMapPin className="h-3 w-3" />
              {offer.listingCity}
            </div>
          )}
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
            STATUS_STYLES[offer.status]
          )}
        >
          {offer.status}
        </span>
      </div>

      {/* Revision timeline — every counter is a new row, never an edit */}
      <div className="space-y-2 mb-3">
        {revisions.map((rev, idx) => {
          const prev = revisions[idx - 1]
          const priceChanged = prev && prev.price !== rev.price
          const isMine = rev.proposedBy === currentUserId
          return (
            <div
              key={rev.id}
              className="flex items-start gap-2 text-sm rounded-lg bg-[#faf7eb] px-3 py-2"
            >
              <span className="text-[10px] font-semibold text-[#5f554d] mt-0.5 shrink-0">
                #{rev.revisionNumber}
              </span>
              <div className="min-w-0">
                <p className="text-[#181411]">
                  {isMine ? 'You' : 'They'} proposed{' '}
                  <span className="font-mono font-semibold text-[#a34702]">
                    {formatPrice(rev.price)}
                  </span>
                  {priceChanged && (
                    <span className="text-xs text-[#5f554d]">
                      {' '}
                      (was {formatPrice(prev.price)})
                    </span>
                  )}
                </p>
                {rev.message && (
                  <p className="text-xs text-[#5f554d] mt-0.5">
                    &ldquo;{rev.message}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-2" role="alert">
          {error}
        </p>
      )}

      {offer.status === 'accepted' && transactionId && (
        <Link
          href={`/dashboard/transactions/${transactionId}`}
          className="inline-flex items-center gap-1 text-sm text-[#a34702] hover:underline"
        >
          View Transaction <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}

      {isOpen && (
        <div className="flex flex-wrap gap-2">
          {isMyTurn ? (
            <>
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={() =>
                  run(() => acceptOfferAction(offer.id, offer.listingId))
                }
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => setIsCountering((v) => !v)}
              >
                Counter
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() =>
                  run(() => rejectOfferAction(offer.id, offer.listingId))
                }
              >
                Reject
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-[#5f554d] self-center">
                Waiting for a response...
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() =>
                  run(() => withdrawOfferAction(offer.id, offer.listingId))
                }
              >
                Withdraw
              </Button>
            </>
          )}
        </div>
      )}

      {isCountering && (
        <div className="mt-3 pt-3 border-t border-[rgba(34,24,18,0.08)] space-y-2">
          <Input
            type="number"
            placeholder="Counteroffer amount (USD)"
            value={counterPrice}
            onChange={(e) => setCounterPrice(e.target.value)}
            min={0}
          />
          <Textarea
            placeholder="Message (optional)"
            value={counterMessage}
            onChange={(e) => setCounterMessage(e.target.value)}
            rows={2}
          />
          <Button size="sm" disabled={isSubmitting} onClick={submitCounter}>
            Send Counteroffer
          </Button>
        </div>
      )}
    </div>
  )
}
