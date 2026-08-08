'use client'

import { IconTrash } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  deleteSavedSearchAction,
  setSearchAlertActiveAction,
} from '@/app/actions/discovery'
import { Button } from '@/components/ui/button'
import type { SavedSearch } from '@/services/discovery.service'

function filtersToQuery(filters: SavedSearch['filters']): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

function filtersSummary(filters: SavedSearch['filters']): string {
  const parts: string[] = []
  if (filters.city) parts.push(filters.city)
  if (filters.listingType)
    parts.push(filters.listingType === 'sale' ? 'For Sale' : 'For Rent')
  if (filters.minPrice) parts.push(`Min $${filters.minPrice}`)
  if (filters.maxPrice) parts.push(`Max $${filters.maxPrice}`)
  if (filters.minBeds) parts.push(`${filters.minBeds}+ beds`)
  if (filters.search) parts.push(`"${filters.search}"`)
  return parts.length > 0 ? parts.join(' · ') : 'All properties'
}

export function SavedSearchCard({ search }: { search: SavedSearch }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alertActive, setAlertActive] = useState(search.alertActive)

  const toggleAlert = async () => {
    setIsSubmitting(true)
    try {
      await setSearchAlertActiveAction(search.id, !alertActive)
      setAlertActive((v) => !v)
    } finally {
      setIsSubmitting(false)
    }
  }

  const remove = async () => {
    setIsSubmitting(true)
    try {
      await deleteSavedSearchAction(search.id)
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-[rgba(34,24,18,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/properties?${filtersToQuery(search.filters)}`}
            className="text-sm font-medium text-[#181411] hover:text-[#a34702] transition-colors"
          >
            {search.name}
          </Link>
          <p className="text-xs text-[#5f554d] mt-0.5">
            {filtersSummary(search.filters)}
          </p>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={isSubmitting}
          onClick={remove}
          aria-label={`Delete saved search "${search.name}"`}
        >
          <IconTrash className="h-3.5 w-3.5" />
        </Button>
      </div>
      <label className="flex items-center gap-2 mt-3 text-xs text-[#5f554d]">
        <input
          type="checkbox"
          checked={alertActive}
          disabled={isSubmitting}
          onChange={toggleAlert}
          className="h-4 w-4 rounded border-[rgba(34,24,18,0.2)] text-[#a34702] focus:ring-[#fa6b05]/30"
        />
        Notify me about new matching listings
      </label>
    </div>
  )
}
