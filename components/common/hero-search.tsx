'use client'

import {
  IconArrowRight,
  IconHome,
  IconKey,
  IconSearch,
} from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function HeroSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'sale' | 'rent'>('all')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('city', query.trim())
    if (type !== 'all') params.set('listingType', type)
    router.push(
      `/properties${params.toString() ? `?${params.toString()}` : ''}`
    )
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      {/* Sale / Rent / All toggle */}
      <div className="inline-flex rounded-xl bg-white border border-[rgba(34,24,18,0.10)] p-1 gap-1 shadow-[0_2px_8px_rgba(24,20,17,0.06)]">
        {(
          [
            { value: 'all', label: 'All' },
            { value: 'sale', label: 'For Sale', Icon: IconHome },
            { value: 'rent', label: 'For Rent', Icon: IconKey },
          ] as {
            value: 'all' | 'sale' | 'rent'
            label: string
            Icon?: React.ComponentType<{ className?: string }>
          }[]
        ).map(({ value, label, Icon }) => (
          <button
            type="button"
            key={value}
            onClick={() => setType(value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              type === value
                ? 'bg-[#fa6b05] text-white shadow-sm'
                : 'text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb]'
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* IconSearch input row */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b8178]" />
          <input
            type="text"
            placeholder="Search by city or neighbourhood..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={cn(
              'w-full h-[52px] pl-11 pr-4 rounded-xl text-sm',
              'bg-white border border-[rgba(34,24,18,0.14)] text-[#181411] placeholder:text-[#8b8178]',
              'focus:outline-none focus:border-[#fa6b05] focus:ring-2 focus:ring-[#fa6b05]/15',
              'transition-all duration-200 shadow-[0_2px_8px_rgba(24,20,17,0.06)]'
            )}
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className={cn(
            'h-[52px] px-6 rounded-xl text-sm font-semibold shrink-0',
            'bg-[#fa6b05] text-white font-semibold',
            'hover:bg-[#c85604] active:bg-[#964003]',
            'transition-all duration-200',
            'inline-flex items-center gap-2',
            'shadow-[0_4px_16px_rgba(250,107,5,0.25)]',
            'hover:shadow-[0_6px_24px_rgba(250,107,5,0.35)]',
            'active:scale-[0.98]'
          )}
        >
          IconSearch
          <IconArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
