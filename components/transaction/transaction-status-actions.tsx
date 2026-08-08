'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { transitionTransactionStatusAction } from '@/app/actions/transactions'
import { Button } from '@/components/ui/button'
import type { TransactionStatus } from '@/services/transaction.service.server'

const NEXT_STATUSES: Record<
  TransactionStatus,
  {
    status: TransactionStatus
    label: string
    variant: 'default' | 'secondary' | 'ghost'
  }[]
> = {
  active: [
    {
      status: 'pending_closing',
      label: 'Enter Pending Closing',
      variant: 'secondary',
    },
    { status: 'cancelled', label: 'Cancel Transaction', variant: 'ghost' },
    { status: 'terminated', label: 'Terminate Transaction', variant: 'ghost' },
  ],
  pending_closing: [
    { status: 'completed', label: 'Mark Completed', variant: 'default' },
    { status: 'active', label: 'Revert to Active', variant: 'secondary' },
    { status: 'cancelled', label: 'Cancel', variant: 'ghost' },
    { status: 'terminated', label: 'Terminate', variant: 'ghost' },
  ],
  completed: [],
  cancelled: [],
  terminated: [],
}

export function TransactionStatusActions({
  transactionId,
  currentStatus,
}: {
  transactionId: string
  currentStatus: TransactionStatus
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = NEXT_STATUSES[currentStatus]
  if (options.length === 0) return null

  const handleTransition = async (status: TransactionStatus) => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await transitionTransactionStatusAction(
        transactionId,
        status
      )
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {error && (
        <p className="text-xs text-red-600 mb-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Button
            key={opt.status}
            size="sm"
            variant={opt.variant}
            disabled={isSubmitting}
            onClick={() => handleTransition(opt.status)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
