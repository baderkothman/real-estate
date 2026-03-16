'use client'

import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToastMessage } from '@/types'

interface ToastProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  error: 'border-red-200 bg-red-50 text-red-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-600',
  info: 'border-[#fa6b05]/20 bg-[#fef0e6] text-[#fa6b05]',
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = iconMap[toast.type]

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 shadow-[0_8px_24px_rgba(24,20,17,0.10)] min-w-[300px] max-w-[400px]',
        'bg-white border-[rgba(34,24,18,0.08)]',
        'animate-slide-up'
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0 mt-0.5',
          colorMap[toast.type].split(' ').pop()
        )}
      />
      <div className="flex-1 text-sm text-[#181411]">{toast.message}</div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-[#8b8178] hover:text-[#5f554d] transition-colors shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
