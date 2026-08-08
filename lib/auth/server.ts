import 'server-only'

import { createNeonAuth } from '@neondatabase/auth/next/server'

export function hasNeonAuthEnv() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET
  )
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? 'https://missing-neon-auth.local',
  cookies: {
    secret:
      process.env.NEON_AUTH_COOKIE_SECRET ??
      'missing-neon-auth-cookie-secret-for-builds',
    sessionDataTtl: 300,
  },
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
})
