import { NextResponse } from 'next/server'
import {
  getActiveSearchAlerts,
  markAlertRun,
} from '@/services/discovery.service.server'
import { getNewMatchingListings } from '@/services/listing.service.server'
import { createNotification } from '@/services/notification.service.server'

// Not wired into any scheduler by this change — deploying this requires
// configuring a cron trigger (Vercel Cron, Supabase scheduled function, or
// equivalent) to hit this route on the desired cadence, and setting
// CRON_SECRET so only that scheduler can invoke it. Dev-runnable manually:
// `curl -X POST http://localhost:3000/api/cron/dispatch-search-alerts`
// (with `Authorization: Bearer $CRON_SECRET` if that's set).
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const alerts = await getActiveSearchAlerts()

  // Each alert belongs to a different saved search/profile and touches no
  // state shared with any other alert, so alerts — and, within one alert,
  // its matching listings — are safe to dispatch concurrently.
  const notifiedCounts = await Promise.all(
    alerts.map(async (alert) => {
      const since =
        alert.lastRunAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000)
      const matches = await getNewMatchingListings(alert.filters, since)

      await Promise.all(
        matches.map((listing) =>
          createNotification({
            profileId: alert.profileId,
            type: 'search_alert_match',
            title: `New listing matches your saved search: "${listing.title}"`,
            linkHref: `/properties/${listing.id}`,
          })
        )
      )

      await markAlertRun(alert.alertId)
      return matches.length
    })
  )

  return NextResponse.json({
    alertsChecked: alerts.length,
    notificationsSent: notifiedCounts.reduce((sum, n) => sum + n, 0),
  })
}

export async function GET(request: Request) {
  return POST(request)
}
