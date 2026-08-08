'use client'

import { IconLock } from '@tabler/icons-react'
import { useState } from 'react'
import { createDepositCheckoutSessionAction } from '@/app/actions/payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatPrice } from '@/lib/utils'
import type { PaymentIntentRecord } from '@/services/payment.service'

const STATUS_STYLES: Record<string, string> = {
  succeeded: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  processing: 'bg-amber-50 border-amber-200 text-amber-700',
  canceled: 'bg-red-50 border-red-200 text-red-700',
}

export function PaymentList({
  transactionId,
  paymentIntents,
  commissionAmount,
  commissionRatePercent,
}: {
  transactionId: string
  paymentIntents: PaymentIntentRecord[]
  commissionAmount?: number
  commissionRatePercent?: number
}) {
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasActiveDeposit = paymentIntents.some(
    (pi) =>
      pi.purpose === 'deposit' &&
      (pi.status === 'succeeded' || pi.status === 'processing')
  )

  const payDeposit = async () => {
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Enter a valid deposit amount')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await createDepositCheckoutSessionAction(
        transactionId,
        value
      )
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      if ('url' in result && result.url) {
        window.location.href = result.url
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {paymentIntents.length === 0 ? (
        <p className="text-sm text-[#5f554d] py-2">
          No payment has been recorded for this transaction.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {paymentIntents.map((pi) => (
            <div
              key={pi.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white border border-[rgba(34,24,18,0.08)]"
            >
              <div>
                <p className="text-sm font-medium text-[#181411] capitalize">
                  {pi.purpose}
                </p>
                <p className="text-xs text-[#5f554d]">
                  {pi.payments[0]?.heldBy
                    ? `Payment held by ${pi.payments[0].heldBy}`
                    : 'Awaiting payment'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-[#181411]">
                  {formatPrice(pi.amount)}
                </p>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                    STATUS_STYLES[pi.status] ??
                      'bg-[#f5f0e8] border-[rgba(34,24,18,0.14)] text-[#5f554d]'
                  )}
                >
                  {pi.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {commissionAmount !== undefined && (
        <p className="text-xs text-[#5f554d] mb-4">
          Commission applied: {formatPrice(commissionAmount)}
          {commissionRatePercent !== undefined &&
            ` (${commissionRatePercent}%)`}
        </p>
      )}

      {!hasActiveDeposit && (
        <div className="p-4 rounded-xl bg-[#faf7eb] space-y-2">
          <p className="text-xs font-semibold text-[#5f554d] uppercase tracking-[0.15em]">
            Pay Deposit
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Deposit amount (USD)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
            />
            <Button size="sm" disabled={isSubmitting} onClick={payDeposit}>
              Pay with Stripe
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-[#5f554d]">
            <IconLock className="h-3 w-3" />
            Payment held by Stripe — this is not an escrow account. Payout to
            the seller/landlord is handled outside this platform until a payout
            provider is configured.
          </p>
        </div>
      )}
    </div>
  )
}
