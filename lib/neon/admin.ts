import 'server-only'

import { auth } from '@/lib/auth/server'
import { createPgAdminClient } from '@/lib/neon/pg-admin-client'

// The Data API's bearer-token route to admin/RLS-bypassing access requires a
// custom JWT provider (a hosted JWKS endpoint) — infra this project doesn't
// have. `createPgAdminClient()` instead talks directly to Postgres over
// `DATABASE_URL`, which already carries BYPASSRLS. See the comment atop
// lib/neon/pg-admin-client.ts for the full rationale.
export function createAdminClient() {
  const client = createPgAdminClient()

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
