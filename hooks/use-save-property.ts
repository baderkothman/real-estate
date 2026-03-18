'use client'

import { useMemo, useState } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'

interface UseSavePropertyReturn {
  isSaved: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

export function useSaveProperty(
  propertyId: string,
  initialSaved: boolean
): UseSavePropertyReturn {
  const { user } = useSupabase()
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isLoading, setIsLoading] = useState(false)
  const loginUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '/auth/login'
    }

    const callbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    return `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
  }, [])

  const toggle = async () => {
    if (!user) {
      window.location.href = loginUrl
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.status === 401) {
        window.location.href = loginUrl
        return
      }

      if (!res.ok) {
        throw new Error('Failed to toggle save')
      }

      const data = (await res.json()) as { saved: boolean }
      setIsSaved(data.saved)
    } catch (err) {
      console.error('Save toggle error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return { isSaved, isLoading, toggle }
}
