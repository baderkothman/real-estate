import 'server-only'

import { createNeonAuth } from '@neondatabase/auth/next/server'
import { requireServerEnv } from '@/lib/neon/env'

export function hasNeonAuthEnv() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET
  )
}

export const auth = createNeonAuth({
  baseUrl: requireServerEnv('NEON_AUTH_BASE_URL'),
  cookies: {
    secret: requireServerEnv('NEON_AUTH_COOKIE_SECRET'),
    sessionDataTtl: 300,
  },
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
})
