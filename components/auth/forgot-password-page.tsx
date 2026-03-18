'use client'

import { IconAlertCircle, IconCircleCheck, IconMail } from '@tabler/icons-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

function getResetErrorMessage(message: string) {
  if (/rate limit/i.test(message)) {
    return 'Too many reset emails were sent recently. Please wait a minute and try again.'
  }

  return message
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const supabase = createClient()
      const redirectTo =
        typeof window === 'undefined'
          ? undefined
          : `${window.location.origin}/auth/reset-password`

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : undefined
      )

      if (resetError) {
        setError(getResetErrorMessage(resetError.message))
        return
      }

      setSuccess(
        'If an account exists for that email, a password reset link has been sent.'
      )
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
            Reset Your Password
          </h1>
          <p className="text-[#5f554d] text-sm">
            Enter the email address you used to create your account.
          </p>
        </div>

        <div className="rounded-[20px] border border-[rgba(34,24,18,0.08)] bg-white shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <IconAlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <IconCircleCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
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
                  Sending link...
                </span>
              ) : (
                <>
                  <IconMail className="h-4 w-4" />
                  Send Reset Link
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-[#8b8178] mt-6">
            Remembered your password?{' '}
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
