'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/neon/server'
import { logAudit } from '@/services/audit.service'
import {
  banUser,
  changeUserPlan,
  getUserById,
  getUsers,
  updateUser,
} from '@/services/user.service'
import type { Plan, User } from '@/types'

type UserProfile = {
  id: string
  email: string
  name: string
  phone: string
  profileImage?: string
  bio?: string
  plan: Plan
  role: User['role']
  isBanned: boolean
}

type UpdateUserProfileInput = {
  name?: string
  phone?: string
  profileImage?: string
  bio?: string
}

type AdminUserActionInput = {
  action: 'ban' | 'unban' | 'change_plan'
  plan?: Plan
}

const VALID_PLANS: Plan[] = ['free', 'pro', 'agency']

async function getAuthenticatedUserId() {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()

  return user?.id ?? null
}

async function getAdminProfile() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return null

  const profile = await getUserById(userId)
  return profile?.role === 'admin' ? profile : null
}

function toUserProfile(profile: User): UserProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
    profileImage: profile.profileImage,
    bio: profile.bio,
    plan: profile.plan,
    role: profile.role,
    isBanned: profile.isBanned,
  }
}

function sanitizeProfileInput(input: UpdateUserProfileInput): Partial<User> {
  const safeData: Partial<User> = {}

  if (typeof input.name === 'string') safeData.name = input.name
  if (typeof input.phone === 'string') safeData.phone = input.phone
  if (typeof input.profileImage === 'string') {
    safeData.profileImage = input.profileImage
  }
  if (typeof input.bio === 'string') safeData.bio = input.bio

  return safeData
}

export async function getCurrentUserProfileAction() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { profile: null }

  const profile = await getUserById(userId)
  if (!profile) {
    return { profile: null, error: 'Profile not found' }
  }

  return { profile: toUserProfile(profile) }
}

export async function updateUserProfileAction(
  id: string,
  input: UpdateUserProfileInput
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  const currentProfile = await getUserById(userId)
  const isAdmin = currentProfile?.role === 'admin'
  if (userId !== id && !isAdmin) return { error: 'Forbidden' }

  try {
    const updated = await updateUser(id, sanitizeProfileInput(input))
    if (!updated) return { error: 'User not found' }

    revalidatePath('/dashboard/profile')
    revalidatePath('/dashboard/profile/edit')
    revalidatePath(`/users/${id}`)

    return { user: toUserProfile(updated) }
  } catch {
    return { error: 'Failed to update user' }
  }
}

export async function getAdminUsersAction(input: {
  search?: string
  plan?: string
  page?: number
  pageSize?: number
}) {
  const admin = await getAdminProfile()
  if (!admin) return { error: 'Forbidden' }

  try {
    const result = await getUsers(
      input.search || undefined,
      input.plan || undefined,
      input.page ?? 1,
      input.pageSize ?? 20
    )
    return { result }
  } catch {
    return { error: 'Failed to load users' }
  }
}

function auditSnapshot(user: User | null) {
  if (!user) return null
  return {
    email: user.email,
    plan: user.plan,
    isBanned: user.isBanned,
  }
}

export async function adminUserAction(id: string, input: AdminUserActionInput) {
  const admin = await getAdminProfile()
  if (!admin) return { error: 'Forbidden' }

  // Every branch logs an audit_log entry with a before/after snapshot —
  // this was the one admin-action surface (ban/unban/plan changes) that
  // never wrote to audit_log, unlike the property moderation actions in
  // app/actions/properties.ts. Fixed as part of Milestone 11's audit-log
  // viewer, since a searchable log that's silently missing a whole class
  // of admin action would be misleading.
  const before = await getUserById(id).catch(() => null)
  if (!before) return { error: 'User not found' }

  try {
    switch (input.action) {
      case 'ban': {
        await banUser(id, true)
        const after = await getUserById(id)
        await logAudit({
          actorId: admin.id,
          entityType: 'user',
          entityId: id,
          action: 'ban',
          beforeData: auditSnapshot(before),
          afterData: auditSnapshot(after),
        })
        revalidatePath('/admin/users')
        revalidatePath(`/users/${id}`)
        return { success: true, action: 'banned' }
      }

      case 'unban': {
        await banUser(id, false)
        const after = await getUserById(id)
        await logAudit({
          actorId: admin.id,
          entityType: 'user',
          entityId: id,
          action: 'unban',
          beforeData: auditSnapshot(before),
          afterData: auditSnapshot(after),
        })
        revalidatePath('/admin/users')
        revalidatePath(`/users/${id}`)
        return { success: true, action: 'unbanned' }
      }

      case 'change_plan': {
        if (!input.plan || !VALID_PLANS.includes(input.plan)) {
          return { error: 'Plan is required' }
        }
        await changeUserPlan(id, input.plan)
        const after = await getUserById(id)
        await logAudit({
          actorId: admin.id,
          entityType: 'user',
          entityId: id,
          action: 'change_plan',
          beforeData: auditSnapshot(before),
          afterData: auditSnapshot(after),
        })
        revalidatePath('/admin/users')
        revalidatePath(`/users/${id}`)
        revalidatePath('/dashboard/profile')
        return {
          success: true,
          action: 'plan_changed',
          plan: input.plan,
        }
      }
    }
  } catch {
    return { error: 'Action failed' }
  }
}
