'use client'

import {
  IconAdjustmentsHorizontal,
  IconSearch,
  IconX,
} from '@tabler/icons-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function PropertyFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [city, setCity] = useState(searchParams.get('city') ?? '')
  const [listingType, setListingType] = useState(
    searchParams.get('listingType') ?? ''
  )
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '')

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    if (city) params.set('city', city)
    if (listingType && listingType !== 'all')
      params.set('listingType', listingType)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    return params.toString()
  }, [city, listingType, minPrice, maxPrice])

  const handleSearch = () => {
    const query = buildQuery()
    router.push(`${pathname}${query ? `?${query}` : ''}`)
  }

  const handleReset = () => {
    setCity('')
    setListingType('')
    setMinPrice('')
    setMaxPrice('')
    router.push(pathname)
  }

  const hasFilters = city || listingType || minPrice || maxPrice

  const activeCount = [city, listingType, minPrice, maxPrice].filter(
    Boolean
  ).length

  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] overflow-hidden shadow-[0_6px_20px_rgba(24,20,17,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb]">
        <div className="flex items-center gap-2.5">
          <IconAdjustmentsHorizontal className="h-4 w-4 text-[#fa6b05]" />
          <h2 className="font-display text-base font-semibold text-[#181411]">
            Filters
          </h2>
          {activeCount > 0 && (
            <span className="h-5 w-5 rounded-full bg-[#fa6b05] text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-[#8b8178] hover:text-red-600 transition-colors duration-200"
          >
            <IconX className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* City */}
        <div className="space-y-2">
          <Label
            htmlFor="city-filter"
            className="text-[10px] font-semibold text-[#8b8178] uppercase tracking-[0.15em]"
          >
            Location
          </Label>
          <Input
            id="city-filter"
            placeholder="Beirut, Jounieh, Byblos..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Listing Type */}
        <div className="space-y-2">
          <Label className="text-[10px] font-semibold text-[#8b8178] uppercase tracking-[0.15em]">
            Type
          </Label>
          <Select
            value={listingType || 'all'}
            onValueChange={(v) => setListingType(v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sale">For Sale</SelectItem>
              <SelectItem value="rent">For Rent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <Label className="text-[10px] font-semibold text-[#8b8178] uppercase tracking-[0.15em]">
            Price Range (USD)
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Min"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              min={0}
            />
            <Input
              placeholder="Max"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              min={0}
            />
          </div>
        </div>

        {/* IconSearch */}
        <Button onClick={handleSearch} className="w-full gap-2 mt-1">
          <IconSearch className="h-4 w-4" />
          IconSearch Properties
        </Button>
      </div>
    </div>
  )
}
