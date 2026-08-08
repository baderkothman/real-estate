'use server'

import { createClient } from '@/lib/supabase/server'

type Credentials = {
  email: string
  password: string
}

export async function signInAction({ email, password }: Credentials) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? { error: error.message } : { success: true }
}

export async function signUpAction(
  input: Credentials & {
    name: string
    phone: string
  }
) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your password reset session has expired.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  await supabase.auth.signOut()
  return { success: true }
}

export async function changePasswordAction(password: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.auth.updateUser({ password })
  return error ? { error: error.message } : { success: true }
}

export async function signOutAction() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  return error ? { error: error.message } : { success: true }
}
