'use client'

import {
  IconCalendarPlus,
  IconCheck,
  IconFileText,
  IconMessageCircle2,
  IconReceipt2,
} from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitRentalApplicationAction } from '@/app/actions/applications'
import { sendInquiryAction } from '@/app/actions/messaging'
import { submitOfferAction } from '@/app/actions/offers'
import { requestViewingAction } from '@/app/actions/viewings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ListingType } from '@/types'

type PanelMode = 'closed' | 'inquiry' | 'viewing' | 'offer' | 'application'

interface PropertyCtaPanelProps {
  listingId: string
  listingType: ListingType
}

/**
 * Replaces the previous bare mailto/tel contact block with context-specific
 * actions matching the actual next step in a buyer/renter's journey — each
 * button creates a real, trackable domain object (inquiry, viewing, offer,
 * or rental application), never just opens a mailto: link. Negotiation and
 * application review happen in the dashboard, not inline here — this page
 * stays focused on discovery/evaluation. Only rendered for authenticated
 * non-owners — see `PropertyCtaSignInPrompt` for the logged-out state.
 */
export function PropertyCtaPanel({
  listingId,
  listingType,
}: PropertyCtaPanelProps) {
  const router = useRouter()
  const [mode, setMode] = useState<PanelMode>('closed')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [question, setQuestion] = useState('')
  const [viewingDate, setViewingDate] = useState('')
  const [viewingTime, setViewingTime] = useState('')
  const [viewingNote, setViewingNote] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [occupantsCount, setOccupantsCount] = useState('')
  const [hasPets, setHasPets] = useState(false)
  const [moveInDate, setMoveInDate] = useState('')
  const [applicationNotes, setApplicationNotes] = useState('')

  const openMode = (next: PanelMode) => {
    setError(null)
    setSuccess(null)
    setMode((current) => (current === next ? 'closed' : next))
  }

  const submitInquiry = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await sendInquiryAction(listingId, question)
      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
        return
      }
      setSuccess('Your question was sent. The owner will reply here.')
      setQuestion('')
      setMode('closed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitViewing = async () => {
    setError(null)
    if (!viewingDate || !viewingTime) {
      setError('Choose a preferred date and time')
      return
    }
    setIsSubmitting(true)
    try {
      const start = new Date(`${viewingDate}T${viewingTime}`).toISOString()
      const result = await requestViewingAction({
        listingId,
        slots: [{ start }],
        locationNote: viewingNote || undefined,
      })
      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
        return
      }
      setSuccess(
        'Viewing requested. This is not confirmed yet — the owner needs to accept your proposed time.'
      )
      setViewingDate('')
      setViewingTime('')
      setViewingNote('')
      setMode('closed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitOffer = async () => {
    setError(null)
    const price = Number(offerPrice)
    if (!price || price <= 0) {
      setError('Enter a valid offer amount')
      return
    }
    setIsSubmitting(true)
    try {
      const result = await submitOfferAction({
        listingId,
        price,
        message: offerMessage || undefined,
      })
      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
        return
      }
      router.push('/dashboard/offers')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitApplication = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await submitRentalApplicationAction({
        listingId,
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
        occupantsCount: occupantsCount ? Number(occupantsCount) : undefined,
        hasPets,
        moveInDate: moveInDate || undefined,
        notes: applicationNotes || undefined,
      })
      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
        return
      }
      router.push('/dashboard/applications')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6">
      <h3 className="font-display text-lg font-semibold text-[#181411] mb-4">
        Interested in this property?
      </h3>

      {success && (
        <output className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <IconCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </output>
      )}

      <div className="grid grid-cols-1 gap-2">
        <Button
          variant={mode === 'inquiry' ? 'default' : 'secondary'}
          className="w-full justify-start gap-2"
          onClick={() => openMode('inquiry')}
        >
          <IconMessageCircle2 className="h-4 w-4" />
          Ask a Question
        </Button>
        <Button
          variant={mode === 'viewing' ? 'default' : 'secondary'}
          className="w-full justify-start gap-2"
          onClick={() => openMode('viewing')}
        >
          <IconCalendarPlus className="h-4 w-4" />
          Request a Viewing
        </Button>
        {listingType === 'sale' ? (
          <Button
            variant={mode === 'offer' ? 'default' : 'secondary'}
            className="w-full justify-start gap-2"
            onClick={() => openMode('offer')}
          >
            <IconReceipt2 className="h-4 w-4" />
            Start an Offer
          </Button>
        ) : (
          <Button
            variant={mode === 'application' ? 'default' : 'secondary'}
            className="w-full justify-start gap-2"
            onClick={() => openMode('application')}
          >
            <IconFileText className="h-4 w-4" />
            Apply to Rent
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-600">
          {error}
        </p>
      )}

      {mode === 'inquiry' && (
        <div className="mt-4 space-y-3 border-t border-[rgba(34,24,18,0.08)] pt-4">
          <Textarea
            placeholder="Ask about this property — availability, condition, neighborhood..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
          />
          <Button
            size="sm"
            className="w-full"
            disabled={isSubmitting || question.trim().length < 5}
            onClick={submitInquiry}
          >
            {isSubmitting ? 'Sending...' : 'Send Question'}
          </Button>
        </div>
      )}

      {mode === 'viewing' && (
        <div className="mt-4 space-y-3 border-t border-[rgba(34,24,18,0.08)] pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={viewingDate}
              onChange={(e) => setViewingDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
            <Input
              type="time"
              value={viewingTime}
              onChange={(e) => setViewingTime(e.target.value)}
            />
          </div>
          <Textarea
            placeholder="Anything the owner should know (optional)"
            value={viewingNote}
            onChange={(e) => setViewingNote(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-[#5f554d]">
            This proposes a time — it isn't confirmed until the owner accepts
            it.
          </p>
          <Button
            size="sm"
            className="w-full"
            disabled={isSubmitting}
            onClick={submitViewing}
          >
            {isSubmitting ? 'Sending...' : 'Request Viewing'}
          </Button>
        </div>
      )}

      {mode === 'offer' && (
        <div className="mt-4 space-y-3 border-t border-[rgba(34,24,18,0.08)] pt-4">
          <Input
            type="number"
            placeholder="Offer amount (USD)"
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
            min={0}
          />
          <Textarea
            placeholder="Anything the seller should know (optional)"
            value={offerMessage}
            onChange={(e) => setOfferMessage(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-[#5f554d]">
            You'll manage negotiation and see the seller's response from your
            dashboard.
          </p>
          <Button
            size="sm"
            className="w-full"
            disabled={isSubmitting}
            onClick={submitOffer}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Offer'}
          </Button>
        </div>
      )}

      {mode === 'application' && (
        <div className="mt-4 space-y-3 border-t border-[rgba(34,24,18,0.08)] pt-4">
          <Input
            type="number"
            placeholder="Monthly income (optional)"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
            min={0}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Occupants"
              value={occupantsCount}
              onChange={(e) => setOccupantsCount(e.target.value)}
              min={1}
            />
            <Input
              type="date"
              placeholder="Move-in date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#5f554d]">
            <input
              type="checkbox"
              checked={hasPets}
              onChange={(e) => setHasPets(e.target.checked)}
              className="h-4 w-4 rounded border-[rgba(34,24,18,0.2)] text-[#a34702] focus:ring-[#fa6b05]/30"
            />
            I have pets
          </label>
          <Textarea
            placeholder="Anything the landlord should know (optional)"
            value={applicationNotes}
            onChange={(e) => setApplicationNotes(e.target.value)}
            rows={2}
          />
          <Button
            size="sm"
            className="w-full"
            disabled={isSubmitting}
            onClick={submitApplication}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      )}
    </div>
  )
}

export function PropertyCtaSignInPrompt({ loginUrl }: { loginUrl: string }) {
  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 text-center">
      <h3 className="font-display text-lg font-semibold text-[#181411] mb-2">
        Interested in this property?
      </h3>
      <p className="text-sm text-[#5f554d] mb-4">
        Sign in to ask a question, request a viewing, make an offer, or apply to
        rent.
      </p>
      <Button asChild size="sm" className="w-full">
        <a href={loginUrl}>Sign In</a>
      </Button>
    </div>
  )
}
