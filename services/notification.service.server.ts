import 'server-only'

import { createAdminClient } from '@/lib/neon/admin'
import { createClient } from '@/lib/neon/server'

// Server-only data access: callers authenticate before these RLS-protected writes.

export interface Notification {
  id: string
  type: string
  title: string
  body?: string
  linkHref?: string
  readAt?: Date
  createdAt: Date
}

interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  link_href: string | null
  read_at: string | null
  created_at: string
}

function dbRowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? undefined,
    linkHref: row.link_href ?? undefined,
    readAt: row.read_at ? new Date(row.read_at) : undefined,
    createdAt: new Date(row.created_at),
  }
}

/**
 * Creates a notification directly, at the point of the state change that
 * causes it (see call sites across app/actions/*.ts and the Stripe
 * webhook) — not via the unused `events` outbox table. Never throws: a
 * failed notification must not roll back or block the state change it's
 * describing.
 */
export async function createNotification(input: {
  profileId: string
  type: string
  title: string
  body?: string
  linkHref?: string
}): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('notifications').insert({
    profile_id: input.profileId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link_href: input.linkHref ?? null,
  })
  if (error) {
    console.error('Failed to create notification:', error, input)
  }
}

export async function getNotificationsForUser(
  userId: string
): Promise<Notification[]> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('notifications')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as NotificationRow[]).map(dbRowToNotification)
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const dbClient = await createClient()
  const { count } = await dbClient
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .is('read_at', null)

  return count ?? 0
}

export async function markNotificationRead(
  id: string,
  userId: string
): Promise<void> {
  const dbClient = await createClient()
  await dbClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('profile_id', userId)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const dbClient = await createClient()
  await dbClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('profile_id', userId)
    .is('read_at', null)
}
