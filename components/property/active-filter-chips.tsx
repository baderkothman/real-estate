'use client'

import { IconX } from '@tabler/icons-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

const CHIP_PARAMS = [
  'search',
  'city',
  'listingType',
  'minPrice',
  'maxPrice',
  'minBeds',
  'minBaths',
] as const

type ChipParam = (typeof CHIP_PARAMS)[number]

function chipLabel(key: ChipParam, value: string): string {
  switch (key) {
    case 'search':
      return `"${value}"`
    case 'city':
      return value
    case 'listingType':
      return value === 'sale' ? 'For Sale' : 'For Rent'
    case 'minPrice':
      return `Min ${formatPrice(Number(value))}`
    case 'maxPrice':
      return `Max ${formatPrice(Number(value))}`
    case 'minBeds':
      return `${value}+ Beds`
    case 'minBaths':
      return `${value}+ Baths`
    default:
      return value
  }
}

/**
 * Search state (filters) is entirely URL-addressable — this reads directly
 * from the URL rather than duplicating filter state, so it never drifts out
 * of sync with what's actually applied. Removing a chip drops only that
 * param, never resets the whole search.
 */
export function ActiveFilterChips() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const active = CHIP_PARAMS.map((key) => ({
    key,
    value: searchParams.get(key),
  })).filter(
    (entry): entry is { key: ChipParam; value: string } => !!entry.value
  )

  if (active.length === 0) return null

  const removeChip = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key)
    params.delete('page')
    const query = params.toString()
    router.push(`${pathname}${query ? `?${query}` : ''}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {active.map(({ key, value }) => (
        <button
          key={key}
          type="button"
          onClick={() => removeChip(key)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#fa6b05]/25 bg-[#fef0e6] px-3 py-1.5 text-xs font-medium text-[#c65505] hover:bg-[#fce3cf] transition-colors duration-200"
        >
          {chipLabel(key, value)}
          <IconX className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => router.push(pathname)}
        className="text-xs text-[#5f554d] hover:text-red-600 transition-colors duration-200 underline underline-offset-2"
      >
        Clear all
      </button>
    </div>
  )
}
