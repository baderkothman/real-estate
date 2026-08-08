import { IconBell } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/common/empty-state'
import { NotificationListClient } from '@/components/layout/notification-list-client'
import { createClient } from '@/lib/neon/server'
import { getNotificationsForUser } from '@/services/notification.service.server'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const notifications = await getNotificationsForUser(user.id)

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={IconBell}
        title="No notifications yet"
        description="You'll see updates about your listings, viewings, messages, offers, and applications here."
      />
    )
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[#181411] mb-4">
        Notifications
      </h2>
      <NotificationListClient notifications={notifications} />
    </div>
  )
}
