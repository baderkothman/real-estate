'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'
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
  supabase: SupabaseClient
  user: UserProfile | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/me')
      if (res.ok) {
        const data = (await res.json()) as UserProfile
        setUser(data)
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
    let isActive = true

    const initializeUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          await fetchProfile()
          return
        }
      } catch {
        // Fall back to the anonymous state if session lookup fails.
      }

      if (isActive) {
        setUser(null)
        setLoading(false)
      }
    }

    void initializeUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void fetchProfile()
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const value = useMemo(
    () => ({ supabase, user, loading, refreshUser: fetchProfile }),
    [supabase, user, loading, fetchProfile]
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
