import type { Metadata } from 'next'
import { ResetPasswordPage } from '@/components/auth/reset-password-page'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your Othman Real Estate account.',
}

export default async function ResetPasswordRoute() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <ResetPasswordPage hasSession={Boolean(user)} />
}
