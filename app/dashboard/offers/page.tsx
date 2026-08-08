import { IconReceipt2 } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/common/empty-state'
import { OfferCard } from '@/components/offers/offer-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/server'
import {
  getOffersMade,
  getOffersReceived,
  getRevisionsForOffer,
  type Offer,
} from '@/services/offer.service'
import { getTransactionBySource } from '@/services/transaction.service.server'

export const metadata: Metadata = { title: 'Offers' }

async function loadOfferDetails(offers: Offer[]) {
  return Promise.all(
    offers.map(async (offer) => ({
      offer,
      revisions: await getRevisionsForOffer(offer.id),
      transaction:
        offer.status === 'accepted'
          ? await getTransactionBySource('offer', offer.id)
          : null,
    }))
  )
}

export default async function DashboardOffersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [made, received] = await Promise.all([
    getOffersMade(user.id),
    getOffersReceived(user.id),
  ])

  const [madeDetails, receivedDetails] = await Promise.all([
    loadOfferDetails(made),
    loadOfferDetails(received),
  ])

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[#181411] mb-4">
        Offers
      </h2>

      <Tabs defaultValue="received">
        <TabsList className="mb-6">
          <TabsTrigger value="received">
            Offers Received ({received.length})
          </TabsTrigger>
          <TabsTrigger value="made">Your Offers ({made.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {receivedDetails.length === 0 ? (
            <EmptyState
              icon={IconReceipt2}
              title="No offers received"
              description="Offers submitted on your sale listings will show up here."
            />
          ) : (
            <div className="space-y-3">
              {receivedDetails.map(({ offer, revisions, transaction }) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  revisions={revisions}
                  currentUserId={user.id}
                  transactionId={transaction?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="made">
          {madeDetails.length === 0 ? (
            <EmptyState
              icon={IconReceipt2}
              title="No offers made"
              description="Start an offer from any sale listing page to see it here."
              actionLabel="Browse Properties"
              actionHref="/properties"
            />
          ) : (
            <div className="space-y-3">
              {madeDetails.map(({ offer, revisions, transaction }) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  revisions={revisions}
                  currentUserId={user.id}
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
