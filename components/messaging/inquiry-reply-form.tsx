'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  closeInquiryAction,
  replyToInquiryAction,
} from '@/app/actions/messaging'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function InquiryReplyForm({ inquiryId }: { inquiryId: string }) {
  const router = useRouter()
  const [reply, setReply] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitReply = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await replyToInquiryAction(inquiryId, reply)
      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
        return
      }
      router.push(`/dashboard/messages/${result.conversationId}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const dismiss = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await closeInquiryAction(inquiryId)
      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
        return
      }
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <Textarea
        placeholder="Write a reply..."
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
      />
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isSubmitting || reply.trim().length === 0}
          onClick={submitReply}
        >
          {isSubmitting ? 'Sending...' : 'Reply'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isSubmitting}
          onClick={dismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
