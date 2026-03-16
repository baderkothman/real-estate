import { mockUsers } from '@/data/mock-users'
import type { CreateUserInput, PaginatedResult, Plan, User } from '@/types'

let usersStore: User[] = [...mockUsers]

export async function getUsers(
  search?: string,
  plan?: string,
  page = 1,
  pageSize = 12
): Promise<PaginatedResult<User>> {
  let filtered = usersStore.filter((u) => !u.isBanned || true) // include all for admin

  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
    )
  }

  if (plan && plan !== 'all') {
    filtered = filtered.filter((u) => u.plan === plan)
  }

  const sorted = filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const total = sorted.length
  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize
  const data = sorted.slice(offset, offset + pageSize)

  return { data, total, page, pageSize, totalPages }
}

export async function getUserById(id: string): Promise<User | null> {
  return usersStore.find((u) => u.id === id) ?? null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return (
    usersStore.find((u) => u.email.toLowerCase() === email.toLowerCase()) ??
    null
  )
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const existing = await getUserByEmail(data.email)
  if (existing) throw new Error('Email already in use')

  const newUser: User = {
    id: `u${Date.now()}`,
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash: data.password, // In production: bcrypt hash
    bio: data.bio,
    plan: 'free',
    role: 'user',
    isBanned: false,
    createdAt: new Date(),
  }

  usersStore = [newUser, ...usersStore]
  return newUser
}

export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<User | null> {
  const idx = usersStore.findIndex((u) => u.id === id)
  if (idx === -1) return null

  // Don't allow role change via this method
  const { role: _role, ...safeData } = data
  usersStore[idx] = { ...usersStore[idx], ...safeData }
  return usersStore[idx]
}

export async function banUser(id: string, banned: boolean): Promise<boolean> {
  const idx = usersStore.findIndex((u) => u.id === id)
  if (idx === -1) return false
  usersStore[idx] = { ...usersStore[idx], isBanned: banned }
  return true
}

export async function changeUserPlan(id: string, plan: Plan): Promise<boolean> {
  const idx = usersStore.findIndex((u) => u.id === id)
  if (idx === -1) return false
  usersStore[idx] = { ...usersStore[idx], plan }
  return true
}

export async function getPublicUsers(
  search?: string,
  plan?: string,
  page = 1,
  pageSize = 12
): Promise<PaginatedResult<User>> {
  let filtered = usersStore.filter((u) => !u.isBanned)

  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }

  if (plan && plan !== 'all') {
    filtered = filtered.filter((u) => u.plan === plan)
  }

  const sorted = filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const total = sorted.length
  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize
  const data = sorted.slice(offset, offset + pageSize)

  return { data, total, page, pageSize, totalPages }
}
