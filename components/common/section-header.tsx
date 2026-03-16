import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  viewAllHref?: string
  viewAllLabel?: string
  centered?: boolean
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  eyebrow = 'Properties',
  viewAllHref,
  viewAllLabel = 'View All',
  centered = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-end gap-4',
        centered && 'items-center text-center sm:flex-col sm:items-center',
        className
      )}
    >
      <div className={cn('flex-1', centered && 'text-center')}>
        {/* Eyebrow with flanking lines */}
        <div
          className={cn(
            'flex items-center gap-3 mb-3',
            centered && 'justify-center'
          )}
        >
          <span className="h-px w-6 bg-gradient-to-r from-transparent to-[#fa6b05]/70" />
          <span className="text-[10px] font-semibold text-[#fa6b05] uppercase tracking-[0.2em]">
            {eyebrow}
          </span>
          <span className="h-px w-6 bg-gradient-to-l from-transparent to-[#fa6b05]/70" />
        </div>

        <h2 className="font-display text-3xl md:text-4xl lg:text-[2.6rem] font-semibold text-[#181411] tracking-wide leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2.5 text-[#5f554d] text-base leading-relaxed max-w-lg">
            {subtitle}
          </p>
        )}
      </div>

      {viewAllHref && !centered && (
        <Link
          href={viewAllHref}
          className="group flex items-center gap-1.5 text-sm text-[#5f554d] hover:text-[#fa6b05] font-medium transition-all duration-200 shrink-0 px-4 py-2 rounded-lg border border-transparent hover:border-[#fa6b05]/20 hover:bg-[#fef0e6]"
        >
          {viewAllLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      )}

      {viewAllHref && centered && (
        <Link
          href={viewAllHref}
          className="group flex items-center gap-1.5 text-sm text-[#fa6b05] hover:text-[#c85604] font-medium transition-colors mt-2"
        >
          {viewAllLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  )
}
