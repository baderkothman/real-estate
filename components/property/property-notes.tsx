'use client'

import { IconTrash } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  addPropertyNoteAction,
  deletePropertyNoteAction,
} from '@/app/actions/discovery'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatRelativeDate } from '@/lib/utils'
import type { PropertyNote } from '@/services/discovery.service.server'

export function PropertyNotes({
  listingId,
  notes,
}: {
  listingId: string
  notes: PropertyNote[]
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const add = async () => {
    if (body.trim().length === 0) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await addPropertyNoteAction(listingId, body)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      setBody('')
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    await deletePropertyNoteAction(id, listingId)
    router.refresh()
  }

  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6">
      <h3 className="font-display text-lg font-semibold text-[#181411] mb-1">
        Your Private Notes
      </h3>
      <p className="text-xs text-[#5f554d] mb-4">
        Only visible to you — not shared with the owner or other users.
      </p>

      {notes.length > 0 && (
        <div className="space-y-2 mb-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-start justify-between gap-2 p-3 rounded-lg bg-[#faf7eb]"
            >
              <div>
                <p className="text-sm text-[#181411] whitespace-pre-line">
                  {note.body}
                </p>
                <p className="text-[10px] text-[#5f554d] mt-1">
                  {formatRelativeDate(note.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(note.id)}
                className="text-[#5f554d] hover:text-red-600 transition-colors shrink-0"
                aria-label="Delete note"
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Textarea
        placeholder="Add a note — pros, cons, questions to ask..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
      />
      {error && (
        <p className="text-xs text-red-600 mt-1.5" role="alert">
          {error}
        </p>
      )}
      <Button
        size="sm"
        className="w-full mt-2"
        disabled={isSubmitting || body.trim().length === 0}
        onClick={add}
      >
        Add Note
      </Button>
    </div>
  )
}
