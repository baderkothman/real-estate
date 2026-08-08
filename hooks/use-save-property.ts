'use client'

import { useMemo, useState } from 'react'
import { toggleSavePropertyAction } from '@/app/actions/properties'
import { useNeon } from '@/components/providers/neon-provider'

interface UseSavePropertyReturn {
  isSaved: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

export function useSaveProperty(
  propertyId: string,
  initialSaved: boolean
): UseSavePropertyReturn {
  const { user } = useNeon()
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
      const data = await toggleSavePropertyAction(propertyId)
      if ('error' in data && data.error === 'Unauthorized') {
        window.location.href = loginUrl
        return
      }

      if ('error' in data) throw new Error(data.error)

      setIsSaved(data.saved)
    } catch (err) {
      console.error('Save toggle error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return { isSaved, isLoading, toggle }
}
