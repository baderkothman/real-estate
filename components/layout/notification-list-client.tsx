'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/actions/notifications'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeDate } from '@/lib/utils'
import type { Notification } from '@/services/notification.service'

function NotificationBody({ n }: { n: Notification }) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-colors',
        n.readAt
          ? 'bg-white border-[rgba(34,24,18,0.08)]'
          : 'bg-[#fef0e6]/60 border-[#fa6b05]/20'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            'text-sm',
            n.readAt ? 'text-[#5f554d]' : 'font-medium text-[#181411]'
          )}
        >
          {n.title}
        </p>
        <span className="text-xs text-[#5f554d] shrink-0">
          {formatRelativeDate(n.createdAt)}
        </span>
      </div>
      {n.body && <p className="text-xs text-[#5f554d] mt-1">{n.body}</p>}
    </div>
  )
}

function NotificationRow({
  n,
  onRead,
}: {
  n: Notification
  onRead: (id: string) => void
}) {
  if (n.linkHref) {
    return (
      <Link
        href={n.linkHref}
        onClick={() => !n.readAt && onRead(n.id)}
        className="block"
      >
        <NotificationBody n={n} />
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={() => !n.readAt && onRead(n.id)}
      className="block w-full text-left"
    >
      <NotificationBody n={n} />
    </button>
  )
}

export function NotificationListClient({
  notifications,
}: {
  notifications: Notification[]
}) {
  const router = useRouter()
  const hasUnread = notifications.some((n) => !n.readAt)

  const markAll = async () => {
    await markAllNotificationsReadAction()
    router.refresh()
  }

  const markOne = async (id: string) => {
    await markNotificationReadAction(id)
    router.refresh()
  }

  return (
    <div>
      {hasUnread && (
        <div className="flex justify-end mb-3">
          <Button size="sm" variant="ghost" onClick={markAll}>
            Mark all as read
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {notifications.map((n) => (
          <NotificationRow key={n.id} n={n} onRead={markOne} />
        ))}
      </div>
    </div>
  )
}
