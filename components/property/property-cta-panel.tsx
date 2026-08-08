'use client'

import {
  IconCalendarPlus,
  IconCheck,
  IconFileText,
  IconMessageCircle2,
  IconReceipt2,
} from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useMemo, useReducer } from 'react'
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

// All of the panel's mode-switching, submission-lifecycle, and per-mode form
// fields are one related state machine — only one mode's fields are ever
// visible/relevant at a time, and opening a mode or submitting touches
// several of these together. Grouped into a reducer instead of ~15 separate
// useState calls.
interface CtaFormState {
  mode: PanelMode
  isSubmitting: boolean
  error: string | null
  success: string | null
  question: string
  viewingDate: string
  viewingTime: string
  viewingNote: string
  offerPrice: string
  offerMessage: string
  monthlyIncome: string
  occupantsCount: string
  hasPets: boolean
  moveInDate: string
  applicationNotes: string
}

const initialCtaFormState: CtaFormState = {
  mode: 'closed',
  isSubmitting: false,
  error: null,
  success: null,
  question: '',
  viewingDate: '',
  viewingTime: '',
  viewingNote: '',
  offerPrice: '',
  offerMessage: '',
  monthlyIncome: '',
  occupantsCount: '',
  hasPets: false,
  moveInDate: '',
  applicationNotes: '',
}

type CtaFormAction =
  | { type: 'openMode'; mode: PanelMode }
  | {
      [K in keyof CtaFormState]: {
        type: 'fieldChanged'
        name: K
        value: CtaFormState[K]
      }
    }[keyof CtaFormState]

function ctaFormReducer(
  state: CtaFormState,
  action: CtaFormAction
): CtaFormState {
  switch (action.type) {
    case 'openMode':
      return {
        ...state,
        error: null,
        success: null,
        mode: state.mode === action.mode ? 'closed' : action.mode,
      }
    case 'fieldChanged':
      return { ...state, [action.name]: action.value }
    default:
      return state
  }
}

function InquiryForm({
  question,
  isSubmitting,
  onQuestionChange,
  onSubmit,
}: {
  question: string
  isSubmitting: boolean
  onQuestionChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-[rgba(34,24,18,0.08)] pt-4">
      <Textarea
        placeholder="Ask about this property — availability, condition, neighborhood..."
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        rows={3}
      />
      <Button
        size="sm"
        className="w-full"
        disabled={isSubmitting || question.trim().length < 5}
        onClick={onSubmit}
      >
        {isSubmitting ? 'Sending...' : 'Send Question'}
      </Button>
    </div>
  )
}

function ViewingForm({
  viewingDate,
  viewingTime,
  viewingNote,
  isSubmitting,
  todayIsoDate,
  onFieldChange,
  onSubmit,
}: {
  viewingDate: string
  viewingTime: string
  viewingNote: string
  isSubmitting: boolean
  todayIsoDate: string
  onFieldChange: (
    field: 'viewingDate' | 'viewingTime' | 'viewingNote',
    value: string
  ) => void
  onSubmit: () => void
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-[rgba(34,24,18,0.08)] pt-4">
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={viewingDate}
          onChange={(e) => onFieldChange('viewingDate', e.target.value)}
          min={todayIsoDate}
        />
        <Input
          type="time"
          value={viewingTime}
          onChange={(e) => onFieldChange('viewingTime', e.target.value)}
        />
      </div>
      <Textarea
        placeholder="Anything the owner should know (optional)"
        value={viewingNote}
        onChange={(e) => onFieldChange('viewingNote', e.target.value)}
        rows={2}
      />
      <p className="text-xs text-[#5f554d]">
        This proposes a time — it isn't confirmed until the owner accepts it.
      </p>
      <Button
        size="sm"
        className="w-full"
        disabled={isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? 'Sending...' : 'Request Viewing'}
      </Button>
    </div>
  )
}

function OfferForm({
  offerPrice,
  offerMessage,
  isSubmitting,
  onFieldChange,
  onSubmit,
}: {
  offerPrice: string
  offerMessage: string
  isSubmitting: boolean
  onFieldChange: (field: 'offerPrice' | 'offerMessage', value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-[rgba(34,24,18,0.08)] pt-4">
      <Input
        type="number"
        placeholder="Offer amount (USD)"
        value={offerPrice}
        onChange={(e) => onFieldChange('offerPrice', e.target.value)}
        min={0}
      />
      <Textarea
        placeholder="Anything the seller should know (optional)"
        value={offerMessage}
        onChange={(e) => onFieldChange('offerMessage', e.target.value)}
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
        onClick={onSubmit}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Offer'}
      </Button>
    </div>
  )
}

function ApplicationForm({
  monthlyIncome,
  occupantsCount,
  moveInDate,
  hasPets,
  applicationNotes,
  isSubmitting,
  todayIsoDate,
  onFieldChange,
  onSubmit,
}: {
  monthlyIncome: string
  occupantsCount: string
  moveInDate: string
  hasPets: boolean
  applicationNotes: string
  isSubmitting: boolean
  todayIsoDate: string
  onFieldChange: (
    field:
      | 'monthlyIncome'
      | 'occupantsCount'
      | 'moveInDate'
      | 'hasPets'
      | 'applicationNotes',
    value: string | boolean
  ) => void
  onSubmit: () => void
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-[rgba(34,24,18,0.08)] pt-4">
      <Input
        type="number"
        placeholder="Monthly income (optional)"
        value={monthlyIncome}
        onChange={(e) => onFieldChange('monthlyIncome', e.target.value)}
        min={0}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder="Occupants"
          value={occupantsCount}
          onChange={(e) => onFieldChange('occupantsCount', e.target.value)}
          min={1}
        />
        <Input
          type="date"
          placeholder="Move-in date"
          value={moveInDate}
          onChange={(e) => onFieldChange('moveInDate', e.target.value)}
          min={todayIsoDate}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-[#5f554d]">
        <input
          type="checkbox"
          checked={hasPets}
          onChange={(e) => onFieldChange('hasPets', e.target.checked)}
          className="h-4 w-4 rounded border-[rgba(34,24,18,0.2)] text-[#a34702] focus:ring-[#fa6b05]/30"
        />
        I have pets
      </label>
      <Textarea
        placeholder="Anything the landlord should know (optional)"
        value={applicationNotes}
        onChange={(e) => onFieldChange('applicationNotes', e.target.value)}
        rows={2}
      />
      <Button
        size="sm"
        className="w-full"
        disabled={isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Application'}
      </Button>
    </div>
  )
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
  const [
    {
      mode,
      isSubmitting,
      error,
      success,
      question,
      viewingDate,
      viewingTime,
      viewingNote,
      offerPrice,
      offerMessage,
      monthlyIncome,
      occupantsCount,
      hasPets,
      moveInDate,
      applicationNotes,
    },
    dispatch,
  ] = useReducer(ctaFormReducer, initialCtaFormState)

  const setField = <K extends keyof CtaFormState>(
    name: K,
    value: CtaFormState[K]
  ) => dispatch({ type: 'fieldChanged', name, value } as CtaFormAction)

  // Computed once per mount rather than inline in JSX: these panels only
  // ever render after the user opens them (mode starts 'closed', so there's
  // no server/first-client output to mismatch), but re-deriving "today" on
  // every keystroke re-render is still wasted work and an unstable value.
  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const openMode = (next: PanelMode) => {
    dispatch({ type: 'openMode', mode: next })
  }

  const submitInquiry = async () => {
    setField('error', null)
    setField('isSubmitting', true)
    try {
      const result = await sendInquiryAction(listingId, question)
      if ('error' in result) {
        setField('error', result.error ?? 'Something went wrong')
        return
      }
      setField('success', 'Your question was sent. The owner will reply here.')
      setField('question', '')
      setField('mode', 'closed')
    } finally {
      setField('isSubmitting', false)
    }
  }

  const submitViewing = async () => {
    setField('error', null)
    if (!viewingDate || !viewingTime) {
      setField('error', 'Choose a preferred date and time')
      return
    }
    setField('isSubmitting', true)
    try {
      const start = new Date(`${viewingDate}T${viewingTime}`).toISOString()
      const result = await requestViewingAction({
        listingId,
        slots: [{ start }],
        locationNote: viewingNote || undefined,
      })
      if ('error' in result) {
        setField('error', result.error ?? 'Something went wrong')
        return
      }
      setField(
        'success',
        'Viewing requested. This is not confirmed yet — the owner needs to accept your proposed time.'
      )
      setField('viewingDate', '')
      setField('viewingTime', '')
      setField('viewingNote', '')
      setField('mode', 'closed')
    } finally {
      setField('isSubmitting', false)
    }
  }

  const submitOffer = async () => {
    setField('error', null)
    const price = Number(offerPrice)
    if (!price || price <= 0) {
      setField('error', 'Enter a valid offer amount')
      return
    }
    setField('isSubmitting', true)
    try {
      const result = await submitOfferAction({
        listingId,
        price,
        message: offerMessage || undefined,
      })
      if ('error' in result) {
        setField('error', result.error ?? 'Something went wrong')
        return
      }
      router.push('/dashboard/offers')
    } finally {
      setField('isSubmitting', false)
    }
  }

  const submitApplication = async () => {
    setField('error', null)
    setField('isSubmitting', true)
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
        setField('error', result.error ?? 'Something went wrong')
        return
      }
      router.push('/dashboard/applications')
    } finally {
      setField('isSubmitting', false)
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
        <InquiryForm
          question={question}
          isSubmitting={isSubmitting}
          onQuestionChange={(value) => setField('question', value)}
          onSubmit={() => void submitInquiry()}
        />
      )}

      {mode === 'viewing' && (
        <ViewingForm
          viewingDate={viewingDate}
          viewingTime={viewingTime}
          viewingNote={viewingNote}
          isSubmitting={isSubmitting}
          todayIsoDate={todayIsoDate}
          onFieldChange={(field, value) => setField(field, value)}
          onSubmit={() => void submitViewing()}
        />
      )}

      {mode === 'offer' && (
        <OfferForm
          offerPrice={offerPrice}
          offerMessage={offerMessage}
          isSubmitting={isSubmitting}
          onFieldChange={(field, value) => setField(field, value)}
          onSubmit={() => void submitOffer()}
        />
      )}

      {mode === 'application' && (
        <ApplicationForm
          monthlyIncome={monthlyIncome}
          occupantsCount={occupantsCount}
          moveInDate={moveInDate}
          hasPets={hasPets}
          applicationNotes={applicationNotes}
          isSubmitting={isSubmitting}
          todayIsoDate={todayIsoDate}
          onFieldChange={(field, value) => setField(field, value)}
          onSubmit={() => void submitApplication()}
        />
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
