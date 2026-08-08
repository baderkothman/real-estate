'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/neon/server'
import { createNotification } from '@/services/notification.service.server'
import {
  acceptOffer,
  counterOffer,
  getOfferById,
  rejectOffer,
  submitOffer,
  withdrawOffer,
} from '@/services/offer.service'

async function getAuthenticatedUserId() {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()
  return user?.id ?? null
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function revalidateOfferPaths(listingId?: string) {
  revalidatePath('/dashboard/offers')
  if (listingId) revalidatePath(`/properties/${listingId}`)
}

export async function submitOfferAction(input: {
  listingId: string
  price: number
  contingencies?: Record<string, unknown>
  closingDate?: string
  expiresAt?: string
  message?: string
}) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!input.price || input.price <= 0) {
    return { error: 'Enter a valid offer amount' }
  }

  try {
    const offerId = await submitOffer(input)
    const offer = await getOfferById(offerId)
    if (offer) {
      await createNotification({
        profileId: offer.sellerProfileId,
        type: 'offer_received',
        title: `New offer on "${offer.listingTitle ?? 'your listing'}"`,
        linkHref: '/dashboard/offers',
      })
    }
    revalidateOfferPaths(input.listingId)
    return { offerId }
  } catch (err) {
    console.error('Submit offer error:', err)
    return { error: errorMessage(err, 'Failed to submit offer') }
  }
}

export async function counterOfferAction(input: {
  offerId: string
  listingId: string
  price: number
  contingencies?: Record<string, unknown>
  closingDate?: string
  expiresAt?: string
  message?: string
}) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!input.price || input.price <= 0) {
    return { error: 'Enter a valid counteroffer amount' }
  }

  try {
    const revisionId = await counterOffer(input)
    const offer = await getOfferById(input.offerId)
    if (offer) {
      const otherParty =
        userId === offer.buyerProfileId
          ? offer.sellerProfileId
          : offer.buyerProfileId
      await createNotification({
        profileId: otherParty,
        type: 'offer_countered',
        title: `Counteroffer received on "${offer.listingTitle ?? 'a listing'}"`,
        linkHref: '/dashboard/offers',
      })
    }
    revalidateOfferPaths(input.listingId)
    return { revisionId }
  } catch (err) {
    console.error('Counter offer error:', err)
    return { error: errorMessage(err, 'Failed to send counteroffer') }
  }
}

export async function acceptOfferAction(offerId: string, listingId: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const offerBefore = await getOfferById(offerId)
    const transactionId = await acceptOffer(offerId)
    if (offerBefore) {
      const otherParty =
        userId === offerBefore.buyerProfileId
          ? offerBefore.sellerProfileId
          : offerBefore.buyerProfileId
      await createNotification({
        profileId: otherParty,
        type: 'offer_accepted',
        title: `Your offer on "${offerBefore.listingTitle ?? 'a listing'}" was accepted`,
        linkHref: `/dashboard/transactions/${transactionId}`,
      })
    }
    revalidateOfferPaths(listingId)
    return { transactionId }
  } catch (err) {
    console.error('Accept offer error:', err)
    return { error: errorMessage(err, 'Failed to accept offer') }
  }
}

export async function rejectOfferAction(offerId: string, listingId: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const offer = await getOfferById(offerId)
    await rejectOffer(offerId)
    if (offer) {
      const otherParty =
        userId === offer.buyerProfileId
          ? offer.sellerProfileId
          : offer.buyerProfileId
      await createNotification({
        profileId: otherParty,
        type: 'offer_rejected',
        title: `Your offer on "${offer.listingTitle ?? 'a listing'}" was rejected`,
        linkHref: '/dashboard/offers',
      })
    }
    revalidateOfferPaths(listingId)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to reject offer') }
  }
}

export async function withdrawOfferAction(offerId: string, listingId: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await withdrawOffer(offerId)
    revalidateOfferPaths(listingId)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to withdraw offer') }
  }
}
