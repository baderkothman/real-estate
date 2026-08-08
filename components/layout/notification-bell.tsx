'use client'

import { IconBell } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  getNotificationBellDataAction,
  markNotificationReadAction,
} from '@/app/actions/notifications'
import { formatRelativeDate } from '@/lib/utils'
import type { Notification } from '@/services/notification.service.server'

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    const result = await getNotificationBellDataAction()
    if (!('error' in result)) {
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
    }
  }, [])

  useEffect(() => {
    load()
    // Light polling rather than realtime — consistent with the rest of the app.
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  const handleOpen = () => {
    setOpen((v) => !v)
    if (!open) load()
  }

  const handleClick = async (n: Notification) => {
    if (!n.readAt) {
      await markNotificationReadAction(n.id)
      setNotifications((prev) =>
        prev.map((p) => (p.id === n.id ? { ...p, readAt: new Date() } : p))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    setOpen(false)
    if (n.linkHref) router.push(n.linkHref)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb] transition-colors duration-200"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <IconBell className="h-5 w-5" stroke={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#fa6b05]" />
        )}
      </button>

      {open && (
        <>
          <div
            role="presentation"
            aria-hidden="true"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-[rgba(34,24,18,0.10)] bg-white/98 backdrop-blur-xl shadow-[0_14px_40px_rgba(24,20,17,0.12)] z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb] flex items-center justify-between">
              <p className="text-sm font-semibold text-[#181411]">
                Notifications
              </p>
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-[#a34702] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-[#5f554d] text-center py-8">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm transition-colors duration-150 border-b border-[rgba(34,24,18,0.06)] last:border-0 ${
                      n.readAt
                        ? 'text-[#5f554d] hover:bg-[#faf7eb]'
                        : 'bg-[#fef0e6]/60 text-[#181411] font-medium hover:bg-[#fef0e6]'
                    }`}
                  >
                    <span>{n.title}</span>
                    <span className="text-[10px] text-[#5f554d] font-normal">
                      {formatRelativeDate(n.createdAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
