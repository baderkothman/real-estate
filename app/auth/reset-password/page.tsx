import type { Metadata } from 'next'
import { ResetPasswordPage } from '@/components/auth/reset-password-page'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your Othman Real Estate account.',
}

export default function ResetPasswordRoute() {
  return <ResetPasswordPage />
}
