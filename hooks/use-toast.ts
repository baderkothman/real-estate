'use client'

import { useCallback, useState } from 'react'
import type { ToastMessage, ToastType } from '@/types'

interface UseToastReturn {
  toasts: ToastMessage[]
  toast: (message: string, type?: ToastType, duration?: number) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const newToast: ToastMessage = { id, message, type, duration }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
      }
    },
    []
  )

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  return { toasts, toast, dismiss, dismissAll }
}
