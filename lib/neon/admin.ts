import 'server-only'

import { NeonPostgrestClient } from '@neondatabase/postgrest-js'
import { auth } from '@/lib/auth/server'
import { requireServerEnv } from '@/lib/neon/env'

function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set(
    'Authorization',
    `Bearer ${requireServerEnv('NEON_DATA_API_ADMIN_TOKEN')}`
  )
  return fetch(input, { ...init, headers })
}

export function createAdminClient() {
  const client = new NeonPostgrestClient({
    dataApiUrl: requireServerEnv('NEON_DATA_API_URL'),
    options: {
      global: {
        fetch: adminFetch,
      },
    },
  })

  return Object.assign(client, {
    auth: {
      admin: {
        async createUser(input: {
          email: string
          password: string
          email_confirm?: boolean
          user_metadata?: { name?: string; phone?: string }
        }) {
          const { data, error } = await auth.admin.createUser({
            email: input.email,
            password: input.password,
            name: input.user_metadata?.name ?? input.email.split('@')[0],
            emailVerified: input.email_confirm ?? true,
          } as never)

          const created =
            (data as { user?: unknown } | null)?.user ?? data ?? null

          return {
            data: { user: created as { id: string } | null },
            error,
          }
        },
      },
    },
  })
}
