import type { Metadata } from 'next'
import { RegisterPage } from '@/components/auth/register-page'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create an Othman Real Estate account to list and manage properties.',
}

export default function RegisterRoute() {
  return <RegisterPage />
}
