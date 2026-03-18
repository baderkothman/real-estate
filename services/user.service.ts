import { createAdminClient } from '@/lib/supabase/admin'
import type { CreateUserInput, PaginatedResult, Plan, User } from '@/types'

// ─── DB row type ──────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string
  email: string
  name: string
  phone: string
  profile_image: string | null
  bio: string | null
  plan: Plan
  role: 'user' | 'admin'
  is_banned: boolean
  created_at: string
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function dbRowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    profileImage: row.profile_image ?? undefined,
    bio: row.bio ?? undefined,
    plan: row.plan,
    role: row.role,
    isBanned: row.is_banned,
    createdAt: new Date(row.created_at),
  }
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getUsers(
  search?: string,
  plan?: string,
  page = 1,
  pageSize = 12
): Promise<PaginatedResult<User>> {
  const admin = createAdminClient()

  let query = admin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }
  if (plan && plan !== 'all') {
    query = query.eq('plan', plan)
  }

  const offset = (page - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  const { data, count, error } = await query
  if (error) throw error

  const total = count ?? 0
  return {
    data: ((data as ProfileRow[]) ?? []).map(dbRowToUser),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return dbRowToUser(data as ProfileRow)
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error || !data) return null
  return dbRowToUser(data as ProfileRow)
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const admin = createAdminClient()

  const existing = await getUserByEmail(data.email)
  if (existing) throw new Error('Email already in use')

  const { data: authUser, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      name: data.name,
      phone: data.phone,
    },
  })

  if (error || !authUser.user)
    throw new Error(error?.message ?? 'Failed to create user')

  // Update bio if provided (trigger already created the profile row)
  if (data.bio) {
    await admin
      .from('profiles')
      .update({ bio: data.bio })
      .eq('id', authUser.user.id)
  }

  const user = await getUserById(authUser.user.id)
  if (!user) throw new Error('Failed to retrieve created user')
  return user
}

export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<User | null> {
  const admin = createAdminClient()

  const dbUpdate: Record<string, unknown> = {}
  if (data.name !== undefined) dbUpdate.name = data.name
  if (data.phone !== undefined) dbUpdate.phone = data.phone
  if (data.profileImage !== undefined)
    dbUpdate.profile_image = data.profileImage
  if (data.bio !== undefined) dbUpdate.bio = data.bio
  // role and plan are NOT updatable via this method

  const { data: row, error } = await admin
    .from('profiles')
    .update(dbUpdate)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !row) return null
  return dbRowToUser(row as ProfileRow)
}

export async function banUser(id: string, banned: boolean): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ is_banned: banned })
    .eq('id', id)
  return !error
}

export async function changeUserPlan(id: string, plan: Plan): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ plan }).eq('id', id)
  return !error
}

export async function getPublicUsers(
  search?: string,
  plan?: string,
  page = 1,
  pageSize = 12
): Promise<PaginatedResult<User>> {
  const admin = createAdminClient()

  let query = admin
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('is_banned', false)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (plan && plan !== 'all') {
    query = query.eq('plan', plan)
  }

  const offset = (page - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  const { data, count, error } = await query
  if (error) throw error

  const total = count ?? 0
  return {
    data: ((data as ProfileRow[]) ?? []).map(dbRowToUser),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
