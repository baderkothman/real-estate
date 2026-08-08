'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { sendMessageAction } from '@/app/actions/messaging'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function MessageComposer({
  conversationId,
}: {
  conversationId: string
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (body.trim().length === 0) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await sendMessageAction(conversationId, body)
      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
        return
      }
      setBody('')
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-t border-[rgba(34,24,18,0.08)] p-4">
      {error && (
        <p className="text-xs text-red-600 mb-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          placeholder="Write a message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={2}
          className="flex-1"
        />
        <Button
          size="sm"
          disabled={isSubmitting || body.trim().length === 0}
          onClick={send}
        >
          Send
        </Button>
      </div>
    </div>
  )
}
