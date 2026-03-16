'use client'

import { useState } from 'react'

interface UseSavePropertyReturn {
  isSaved: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

export function useSaveProperty(
  propertyId: string,
  initialSaved: boolean
): UseSavePropertyReturn {
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isLoading, setIsLoading] = useState(false)

  const toggle = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.status === 401) {
        // Redirect to login
        window.location.href = '/auth/login'
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
