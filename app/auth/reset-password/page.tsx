import type { Metadata } from 'next'
import { ResetPasswordPage } from '@/components/auth/reset-password-page'
import { hasNeonAuthEnv } from '@/lib/auth/server'
import { hasNeonDataEnv } from '@/lib/neon/env'
import { createClient } from '@/lib/neon/server'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your Othman Real Estate account.',
}

export const dynamic = 'force-dynamic'

export default async function ResetPasswordRoute() {
  if (!hasNeonAuthEnv() || !hasNeonDataEnv()) {
    return <ResetPasswordPage hasSession={false} />
  }

  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()

  return <ResetPasswordPage hasSession={Boolean(user)} />
}
