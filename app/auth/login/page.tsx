import type { Metadata } from 'next'
import { LoginPage } from '@/components/auth/login-page'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to manage listings, saved properties, and your account.',
}

interface LoginRouteProps {
  searchParams: Promise<{
    callbackUrl?: string
    email?: string
    registered?: string
    reset?: string
  }>
}

export default async function LoginRoute({ searchParams }: LoginRouteProps) {
  const params = await searchParams

  return (
    <LoginPage
      callbackUrl={params.callbackUrl}
      registeredEmail={params.email}
      showRegisteredNotice={params.registered === '1'}
      showResetNotice={params.reset === '1'}
    />
  )
}
