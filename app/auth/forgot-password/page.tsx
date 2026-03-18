import type { Metadata } from 'next'
import { ForgotPasswordPage } from '@/components/auth/forgot-password-page'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Request a password reset link for your Othman Real Estate account.',
}

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />
}
