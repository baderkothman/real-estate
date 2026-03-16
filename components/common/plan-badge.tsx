import { cn } from '@/lib/utils'
import type { Plan } from '@/types'

interface PlanBadgeProps {
  plan: Plan
  className?: string
  size?: 'sm' | 'md'
}

const planConfig = {
  free: {
    label: 'Free',
    className: 'bg-[#faf7eb] border-[rgba(34,24,18,0.12)] text-[#8b8178]',
  },
  pro: {
    label: 'Pro',
    className: 'bg-[#fef0e6] border-[#fa6b05]/25 text-[#964003]',
  },
  agency: {
    label: 'Agency',
    className: 'bg-[#ecf8f5] border-[#379579]/25 text-[#1c4a3c]',
  },
}

export function PlanBadge({ plan, className, size = 'md' }: PlanBadgeProps) {
  const config = planConfig[plan]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold capitalize',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
