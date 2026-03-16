'use client'

import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Suspense, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard/profile'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password. Please try again.')
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-[20px] border border-[rgba(34,24,18,0.08)] bg-white shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-8">
      {/* Demo credentials hint */}
      <div className="mb-6 rounded-lg border border-[#fa6b05]/20 bg-[#fef0e6] px-4 py-3">
        <p className="text-xs text-[#5f554d]">
          <span className="text-[#fa6b05] font-medium">Demo:</span>{' '}
          admin@othman.com / admin123 &nbsp;|&nbsp; user@othman.com / user123
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
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
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8178] hover:text-[#5f554d] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-[rgba(34,24,18,0.20)] bg-white text-[#fa6b05] focus:ring-[#fa6b05]/40"
            />
            <span className="text-sm text-[#5f554d]">Remember me</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-[#fa6b05] hover:text-[#c85604] transition-colors"
          >
            Forgot password?
          </Link>
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
              Signing in...
            </span>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign In
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-[#8b8178] mt-6">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/register"
          className="text-[#fa6b05] hover:text-[#c85604] transition-colors font-medium"
        >
          Create one free
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#fcfaf7]">
      <div className="w-full max-w-md">
        {/* Logo */}
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
            Welcome Back
          </h1>
          <p className="text-[#5f554d] text-sm">
            Sign in to access your account
          </p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-[20px] border border-[rgba(34,24,18,0.08)] bg-white p-8 animate-pulse h-80" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
