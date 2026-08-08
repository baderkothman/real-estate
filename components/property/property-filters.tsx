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

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [city, setCity] = useState(searchParams.get('city') ?? '')
  const [listingType, setListingType] = useState(
    searchParams.get('listingType') ?? ''
  )
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '')
  const [minBeds, setMinBeds] = useState(searchParams.get('minBeds') ?? '')
  const [minBaths, setMinBaths] = useState(searchParams.get('minBaths') ?? '')

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (city) params.set('city', city)
    if (listingType && listingType !== 'all')
      params.set('listingType', listingType)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (minBeds && minBeds !== 'any') params.set('minBeds', minBeds)
    if (minBaths && minBaths !== 'any') params.set('minBaths', minBaths)
    return params.toString()
  }, [search, city, listingType, minPrice, maxPrice, minBeds, minBaths])

  const handleSearch = () => {
    const query = buildQuery()
    router.push(`${pathname}${query ? `?${query}` : ''}`)
  }

  const handleReset = () => {
    setSearch('')
    setCity('')
    setListingType('')
    setMinPrice('')
    setMaxPrice('')
    setMinBeds('')
    setMinBaths('')
    router.push(pathname)
  }

  const hasFilters =
    search || city || listingType || minPrice || maxPrice || minBeds || minBaths

  const activeCount = [
    search,
    city,
    listingType,
    minPrice,
    maxPrice,
    minBeds,
    minBaths,
  ].filter(Boolean).length

  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] overflow-hidden shadow-[0_6px_20px_rgba(24,20,17,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb]">
        <div className="flex items-center gap-2.5">
          <IconAdjustmentsHorizontal className="h-4 w-4 text-[#a34702]" />
          <h2 className="font-display text-base font-semibold text-[#181411]">
            Filters
          </h2>
          {activeCount > 0 && (
            <span className="h-5 w-5 rounded-full bg-[#a34702] text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-[#5f554d] hover:text-red-600 transition-colors duration-200"
          >
            <IconX className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Keyword search */}
        <div className="space-y-2">
          <Label
            htmlFor="search-filter"
            className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em]"
          >
            Keyword
          </Label>
          <Input
            id="search-filter"
            placeholder="Pool, sea view, renovated..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label
            htmlFor="city-filter"
            className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em]"
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
          <Label
            htmlFor="listing-type-filter"
            className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em]"
          >
            Type
          </Label>
          <Select
            value={listingType || 'all'}
            onValueChange={(v) => setListingType(v === 'all' ? '' : v)}
          >
            <SelectTrigger id="listing-type-filter">
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
          <Label className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em]">
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

        {/* Beds / Baths */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label
              htmlFor="min-beds-filter"
              className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em]"
            >
              Beds
            </Label>
            <Select
              value={minBeds || 'any'}
              onValueChange={(v) => setMinBeds(v === 'any' ? '' : v)}
            >
              <SelectTrigger id="min-beds-filter">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="min-baths-filter"
              className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em]"
            >
              Baths
            </Label>
            <Select
              value={minBaths || 'any'}
              onValueChange={(v) => setMinBaths(v === 'any' ? '' : v)}
            >
              <SelectTrigger id="min-baths-filter">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search */}
        <Button onClick={handleSearch} className="w-full gap-2 mt-1">
          <IconSearch className="h-4 w-4" />
          Search Properties
        </Button>
      </div>
    </div>
  )
}
