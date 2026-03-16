import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fa6b05] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[#fa6b05] text-white font-semibold hover:bg-[#c85604] active:bg-[#964003] shadow-[0_2px_12px_rgba(250,107,5,0.20)] hover:shadow-[0_4px_20px_rgba(250,107,5,0.30)]',
        secondary:
          'bg-white text-[#181411] border border-[rgba(34,24,18,0.12)] hover:bg-[#faf7eb] hover:border-[rgba(34,24,18,0.20)]',
        outline:
          'border border-[#fa6b05]/30 text-[#fa6b05] bg-transparent hover:bg-[#fef0e6] hover:border-[#fa6b05]/60',
        ghost:
          'text-[#5f554d] bg-transparent hover:bg-[#faf7eb] hover:text-[#181411]',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
        link: 'text-[#fa6b05] underline-offset-4 hover:underline bg-transparent p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-lg',
        md: 'h-10 px-5',
        lg: 'h-12 px-7 text-[0.925rem] rounded-xl',
        xl: 'h-14 px-10 text-base rounded-xl',
        icon: 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
