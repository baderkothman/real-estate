'use client'

import { IconBellPlus, IconCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { saveSearchAction } from '@/app/actions/discovery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PropertyFilters } from '@/types'

export function SaveSearchButton({ filters }: { filters: PropertyFilters }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await saveSearchAction(name, filters)
      if ('error' in result) {
        setError(result.error ?? 'Failed to save search')
        return
      }
      setSaved(true)
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
        <IconCheck className="h-3.5 w-3.5" />
        Search saved
      </span>
    )
  }

  return (
    <div className="relative">
      <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
        <IconBellPlus className="h-3.5 w-3.5" />
        Save Search
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[rgba(34,24,18,0.1)] bg-white shadow-[0_14px_40px_rgba(24,20,17,0.12)] p-4 z-20">
          <p className="text-xs font-semibold text-[#5f554d] uppercase tracking-[0.15em] mb-2">
            Name this search
          </p>
          <Input
            placeholder="e.g. Beirut apartments under $200k"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          {error && (
            <p className="text-xs text-red-600 mt-1.5" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-[#5f554d] mt-2">
            We'll notify you when new listings match these filters.
          </p>
          <Button
            size="sm"
            className="w-full mt-3"
            disabled={isSubmitting || name.trim().length === 0}
            onClick={submit}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  )
}
