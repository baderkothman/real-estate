import { IconFileText } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ApplicationCard } from '@/components/applications/application-card'
import { EmptyState } from '@/components/common/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/server'
import {
  getApplicationsForOwner,
  getApplicationsSubmitted,
  type RentalApplication,
} from '@/services/application.service'
import { getTransactionBySource } from '@/services/transaction.service'

export const metadata: Metadata = { title: 'Rental Applications' }

async function loadTransactions(applications: RentalApplication[]) {
  return Promise.all(
    applications.map(async (application) => ({
      application,
      transaction:
        application.status === 'approved'
          ? await getTransactionBySource('rental_application', application.id)
          : null,
    }))
  )
}

export default async function DashboardApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [toReview, submitted] = await Promise.all([
    getApplicationsForOwner(user.id),
    getApplicationsSubmitted(user.id),
  ])

  const [toReviewDetails, submittedDetails] = await Promise.all([
    loadTransactions(toReview),
    loadTransactions(submitted),
  ])

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[#181411] mb-4">
        Rental Applications
      </h2>

      <Tabs defaultValue="review">
        <TabsList className="mb-6">
          <TabsTrigger value="review">
            Applications to Review ({toReview.length})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Your Applications ({submitted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review">
          {toReviewDetails.length === 0 ? (
            <EmptyState
              icon={IconFileText}
              title="No applications to review"
              description="Applications submitted on your rental listings will show up here."
            />
          ) : (
            <div className="space-y-3">
              {toReviewDetails.map(({ application, transaction }) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  viewerRole="landlord"
                  transactionId={transaction?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submitted">
          {submittedDetails.length === 0 ? (
            <EmptyState
              icon={IconFileText}
              title="No applications submitted"
              description="Apply to rent from any rental listing page to see it here."
              actionLabel="Browse Properties"
              actionHref="/properties"
            />
          ) : (
            <div className="space-y-3">
              {submittedDetails.map(({ application, transaction }) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  viewerRole="applicant"
                  transactionId={transaction?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
