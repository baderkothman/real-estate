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

interface SupabaseContextType {
  user: UserProfile | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
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

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider')
  }
  return context
}
