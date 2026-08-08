import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[88px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#181411]',
            'border-[rgba(34,24,18,0.14)] placeholder:text-[#5f554d]',
            'focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200 resize-y',
            error &&
              'border-red-400 focus:ring-red-400/30 focus:border-red-400',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
