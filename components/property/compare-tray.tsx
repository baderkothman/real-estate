'use client'

import { IconArrowRight, IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCompare } from '@/hooks/use-compare'

/** Rendered globally (app/layout.tsx); only visible once something is selected. */
export function CompareTray() {
  const { ids, remove, clear } = useCompare()

  if (ids.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full bg-white border border-[rgba(34,24,18,0.1)] shadow-[0_14px_40px_rgba(24,20,17,0.16)] px-4 py-2.5 safe-bottom">
      <span className="text-sm font-medium text-[#181411]">
        Compare ({ids.length}/4)
      </span>
      <div className="flex -space-x-1">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => remove(id)}
            className="flex items-center justify-center h-6 w-6 rounded-full bg-[#fef0e6] border border-white text-[#a34702] hover:bg-[#fce3cf] transition-colors"
            aria-label="Remove from comparison"
          >
            <IconX className="h-3 w-3" />
          </button>
        ))}
      </div>
      <Button size="sm" asChild>
        <Link href={`/compare?ids=${ids.join(',')}`} className="gap-1">
          Compare
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <button
        type="button"
        onClick={clear}
        className="text-xs text-[#5f554d] hover:text-red-600 transition-colors"
      >
        Clear
      </button>
    </div>
  )
}
