'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getCurrentUserProfileAction } from '@/app/actions/users'
import type { Plan, UserRole } from '@/types'

export interface UserProfile {
  id: string
  email: string
  name: string
  phone: string
  profileImage?: string
  bio?: string
  plan: Plan
  role: UserRole
  isBanned: boolean
}

interface NeonContextType {
  user: UserProfile | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const NeonContext = createContext<NeonContextType | undefined>(undefined)

export function NeonProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getCurrentUserProfileAction()
      if (result.profile) {
        setUser(result.profile)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const value = useMemo(
    () => ({ user, loading, refreshUser: fetchProfile }),
    [user, loading, fetchProfile]
  )

  return <NeonContext.Provider value={value}>{children}</NeonContext.Provider>
}

export function useNeon() {
  const context = useContext(NeonContext)
  if (!context) {
    throw new Error('useNeon must be used within NeonProvider')
  }
  return context
}
