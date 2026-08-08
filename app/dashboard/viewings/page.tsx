import { IconCalendarEvent } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/common/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ViewingCard } from '@/components/viewings/viewing-card'
import { createClient } from '@/lib/neon/server'
import {
  getViewingsForHost,
  getViewingsForRequester,
} from '@/services/viewing.service.server'

export const metadata: Metadata = { title: 'Viewings' }

export default async function DashboardViewingsPage() {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const [asHost, asRequester] = await Promise.all([
    getViewingsForHost(user.id),
    getViewingsForRequester(user.id),
  ])

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[#181411] mb-4">
        Viewings
      </h2>

      <Tabs defaultValue="host">
        <TabsList className="mb-6">
          <TabsTrigger value="host">
            Requests for Your Listings ({asHost.length})
          </TabsTrigger>
          <TabsTrigger value="requester">
            Your Requests ({asRequester.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="host">
          {asHost.length === 0 ? (
            <EmptyState
              icon={IconCalendarEvent}
              title="No viewing requests yet"
              description="When someone requests a viewing on one of your listings, it will show up here."
            />
          ) : (
            <div className="space-y-3">
              {asHost.map((viewing) => (
                <ViewingCard
                  key={viewing.id}
                  viewing={viewing}
                  viewerRole="host"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requester">
          {asRequester.length === 0 ? (
            <EmptyState
              icon={IconCalendarEvent}
              title="No viewing requests sent"
              description="Request a viewing from any listing page to see it here."
              actionLabel="Browse Properties"
              actionHref="/properties"
            />
          ) : (
            <div className="space-y-3">
              {asRequester.map((viewing) => (
                <ViewingCard
                  key={viewing.id}
                  viewing={viewing}
                  viewerRole="requester"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
