import type { Icon as TablerIconComponent } from '@tabler/icons-react'
import { IconBuilding } from '@tabler/icons-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: TablerIconComponent
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon = IconBuilding,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[20px] border border-[rgba(34,24,18,0.08)] bg-white shadow-[0_6px_20px_rgba(24,20,17,0.06)] px-8 py-20 text-center',
        className
      )}
    >
      {/* Icon with ambient glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-[#fa6b05]/5 scale-[2] blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-[#fef0e6] border border-[#fa6b05]/15">
          <Icon className="h-9 w-9 text-[#fa6b05]/50" />
        </div>
      </div>
      <h3 className="font-display text-2xl font-semibold text-[#181411] mb-2.5">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#5f554d] max-w-sm leading-relaxed mb-8">
          {description}
        </p>
      )}
      {actionLabel &&
        (actionHref || onAction) &&
        (actionHref ? (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button onClick={onAction}>{actionLabel}</Button>
        ))}
    </div>
  )
}
