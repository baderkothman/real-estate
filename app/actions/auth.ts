'use server'

import { createClient } from '@/lib/neon/server'

type Credentials = {
  email: string
  password: string
}

export async function signInAction({ email, password }: Credentials) {
  const dbClient = await createClient()
  const { error } = await dbClient.auth.signInWithPassword({ email, password })
  return error ? { error: error.message } : { success: true }
}

export async function signUpAction(
  input: Credentials & {
    name: string
    phone: string
  }
) {
  const dbClient = await createClient()
  const { data, error } = await dbClient.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { name: input.name, phone: input.phone },
    },
  })

  if (error) return { error: error.message }
  return { success: true, hasSession: Boolean(data.session) }
}

export async function updatePasswordAction(password: string) {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()
  if (!user) return { error: 'Your password reset session has expired.' }

  const { error } = await dbClient.auth.updateUser({ password })
  if (error) return { error: error.message }

  await dbClient.auth.signOut()
  return { success: true }
}

export async function changePasswordAction(password: string) {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await dbClient.auth.updateUser({ password })
  return error ? { error: error.message } : { success: true }
}

export async function signOutAction() {
  const dbClient = await createClient()
  const { error } = await dbClient.auth.signOut()
  return error ? { error: error.message } : { success: true }
}
