import { NextResponse } from 'next/server'
import {
  getActiveSearchAlerts,
  markAlertRun,
} from '@/services/discovery.service'
import { getNewMatchingListings } from '@/services/listing.service'
import { createNotification } from '@/services/notification.service'

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
  let notified = 0

  for (const alert of alerts) {
    const since = alert.lastRunAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000)
    const matches = await getNewMatchingListings(alert.filters, since)

    for (const listing of matches) {
      await createNotification({
        profileId: alert.profileId,
        type: 'search_alert_match',
        title: `New listing matches your saved search: "${listing.title}"`,
        linkHref: `/properties/${listing.id}`,
      })
      notified++
    }

    await markAlertRun(alert.alertId)
  }

  return NextResponse.json({
    alertsChecked: alerts.length,
    notificationsSent: notified,
  })
}

export async function GET(request: Request) {
  return POST(request)
}
