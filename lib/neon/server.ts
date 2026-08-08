import 'server-only'

import { fetchWithToken, NeonPostgrestClient } from '@neondatabase/postgrest-js'
import { auth } from '@/lib/auth/server'
import { requireServerEnv } from '@/lib/neon/env'

type NeonUser = {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
}

function mapAuthUser(user: NeonUser | null | undefined) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email ?? '',
    user_metadata: {
      name: user.name ?? '',
      avatar_url: user.image ?? '',
    },
  }
}

async function getCurrentAccessToken() {
  const result = (await auth.getAccessToken({} as never)) as {
    data?: string | { accessToken?: string; access_token?: string } | null
    error?: { message?: string } | null
  }

  if (typeof result.data === 'string') return result.data
  if (result.data?.accessToken) return result.data.accessToken
  if (result.data?.access_token) return result.data.access_token

  const anonymous = (await auth.getAnonymousToken({} as never)) as {
    data?:
      | string
      | { token?: string; accessToken?: string; access_token?: string }
      | null
  }
  if (typeof anonymous.data === 'string') return anonymous.data
  return (
    anonymous.data?.accessToken ??
    anonymous.data?.access_token ??
    anonymous.data?.token ??
    null
  )
}

function createDataClient(fetcher: typeof fetch) {
  return new NeonPostgrestClient({
    dataApiUrl: requireServerEnv('NEON_DATA_API_URL'),
    options: {
      global: {
        fetch: fetcher,
      },
    },
  })
}

export async function createClient() {
  const client = createDataClient(fetchWithToken(getCurrentAccessToken))
  return Object.assign(client, {
    auth: {
      async getUser() {
        const { data, error } = await auth.getSession()
        return {
          data: { user: mapAuthUser(data?.user as NeonUser | null) },
          error,
        }
      },
      async getSession() {
        const { data, error } = await auth.getSession()
        return {
          data: {
            session: data
              ? {
                  access_token:
                    'token' in data.session
                      ? data.session.token
                      : (data.session as { access_token?: string })
                          .access_token,
                  user: mapAuthUser(data.user as NeonUser | null),
                }
              : null,
          },
          error,
        }
      },
      async signInWithPassword(credentials: {
        email: string
        password: string
      }) {
        const { data, error } = await auth.signIn.email(credentials)
        return { data, error }
      },
      async signUp(input: {
        email: string
        password: string
        options?: { data?: { name?: string; phone?: string } }
      }) {
        const { data, error } = await auth.signUp.email({
          email: input.email,
          password: input.password,
          name:
            input.options?.data?.name ??
            input.email.split('@')[0] ??
            input.email,
        })
        return {
          data: {
            user: mapAuthUser(data?.user as NeonUser | null),
            session: data ? { access_token: data.token ?? null } : null,
          },
          error,
        }
      },
      async updateUser(input: {
        password?: string
        data?: Record<string, unknown>
      }) {
        if (input.password) {
          const { data, error } = await auth.resetPassword({
            newPassword: input.password,
          } as never)
          return { data, error }
        }
        const { data, error } = await auth.updateUser(input.data ?? {})
        return { data, error }
      },
      async resetPasswordForEmail(
        email: string,
        options?: { redirectTo?: string }
      ) {
        const { data, error } = await auth.requestPasswordReset({
          email,
          redirectTo: options?.redirectTo,
        })
        return { data, error }
      },
      async exchangeCodeForSession(_code: string) {
        return { data: null, error: null }
      },
      async signOut() {
        const { data, error } = await auth.signOut()
        return { data, error }
      },
    },
  })
}
