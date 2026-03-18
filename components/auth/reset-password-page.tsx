'use client'

import { IconAlertCircle, IconKey } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isActive) {
        return
      }

      setHasSession(Boolean(session))
      setCheckingSession(false)
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) {
        return
      }

      setHasSession(Boolean(session))
      setCheckingSession(false)
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      await supabase.auth.signOut()
      router.push('/auth/login?reset=1')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#fcfaf7]">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/">
            <span className="font-display text-3xl font-semibold text-[#fa6b05] tracking-wide">
              Othman
            </span>
            <span className="font-display text-3xl font-light text-[#5f554d] tracking-wide ml-2">
              Real Estate
            </span>
          </Link>
          <h1 className="font-display text-2xl font-semibold text-[#181411] mt-6 mb-2">
            Choose a New Password
          </h1>
          <p className="text-[#5f554d] text-sm">
            Use the link from your email, then set a new password here.
          </p>
        </div>

        <div className="rounded-[20px] border border-[rgba(34,24,18,0.08)] bg-white shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-8">
          {checkingSession ? (
            <div className="flex items-center justify-center py-6 text-sm text-[#8b8178]">
              Checking reset session...
            </div>
          ) : !hasSession ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Open this page from the password reset link sent to your email.
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <IconAlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Updating password...
                    </span>
                  ) : (
                    <>
                      <IconKey className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-[#8b8178] mt-6">
            Need to sign in instead?{' '}
            <Link
              href="/auth/login"
              className="text-[#fa6b05] hover:text-[#c85604] transition-colors font-medium"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
