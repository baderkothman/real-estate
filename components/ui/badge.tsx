import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[#fef0e6] border-[#fa6b05]/25 text-[#964003]',
        secondary: 'bg-[#faf7eb] border-[rgba(34,24,18,0.10)] text-[#5f554d]',
        destructive: 'bg-red-50 border-red-200 text-red-700',
        outline: 'border-[#fa6b05]/30 text-[#fa6b05] bg-transparent',
        pending: 'bg-amber-50 border-amber-200 text-amber-700',
        approved: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        rejected: 'bg-red-50 border-red-200 text-red-700',
        featured: 'bg-[#fef0e6] border-[#fa6b05]/30 text-[#964003]',
        sale: 'bg-sky-50 border-sky-200 text-sky-700',
        rent: 'bg-violet-50 border-violet-200 text-violet-700',
        sold: 'bg-[#181411]/8 border-[rgba(24,20,17,0.12)] text-[#5f554d]',
        free: 'bg-[#faf7eb] border-[rgba(34,24,18,0.10)] text-[#8b8178]',
        pro: 'bg-[#fef0e6] border-[#fa6b05]/25 text-[#964003]',
        agency: 'bg-[#ecf8f5] border-[#379579]/25 text-[#1c4a3c]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
