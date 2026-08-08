'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notification.service.server'

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getNotificationBellDataAction() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(userId),
    getUnreadNotificationCount(userId),
  ])

  return { notifications: notifications.slice(0, 8), unreadCount }
}

export async function markNotificationReadAction(id: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  await markNotificationRead(id, userId)
  revalidatePath('/dashboard/notifications')
  return { success: true }
}

export async function markAllNotificationsReadAction() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  await markAllNotificationsRead(userId)
  revalidatePath('/dashboard/notifications')
  return { success: true }
}
