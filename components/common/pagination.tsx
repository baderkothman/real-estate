'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  className?: string
}

export function Pagination({ page, totalPages, className }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const navigateTo = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | 'ellipsis')[] = [1]
    if (page > 3) pages.push('ellipsis')
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (page < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
    return pages
  }

  const navBtn = cn(
    'h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200',
    'border border-[rgba(34,24,18,0.12)] text-[#8b8178]',
    'hover:bg-white hover:text-[#181411] hover:border-[rgba(34,24,18,0.20)] hover:shadow-[0_2px_8px_rgba(24,20,17,0.06)]',
    'disabled:opacity-30 disabled:cursor-not-allowed'
  )

  return (
    <nav
      className={cn('flex items-center justify-center gap-1.5', className)}
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => navigateTo(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={navBtn}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((num, idx) =>
          num === 'ellipsis' ? (
            <span
              key={`e-${idx}`}
              className="h-9 w-9 flex items-center justify-center text-[#8b8178]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <button
              type="button"
              key={num}
              onClick={() => navigateTo(num)}
              aria-current={num === page ? 'page' : undefined}
              className={cn(
                'h-9 w-9 rounded-xl text-sm font-medium transition-all duration-200',
                num === page
                  ? 'bg-[#fa6b05] text-white font-semibold shadow-[0_2px_8px_rgba(250,107,5,0.25)]'
                  : 'text-[#5f554d] hover:bg-white hover:text-[#181411] border border-transparent hover:border-[rgba(34,24,18,0.12)] hover:shadow-[0_2px_8px_rgba(24,20,17,0.06)]'
              )}
            >
              {num}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => navigateTo(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={navBtn}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <span className="hidden sm:block text-xs text-[#8b8178] ml-2">
        {page} / {totalPages}
      </span>
    </nav>
  )
}
