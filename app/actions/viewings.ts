'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/services/notification.service.server'
import { getPropertyById } from '@/services/property.service'
import {
  cancelViewing,
  completeViewing,
  confirmViewing,
  markViewingNoShow,
  proposeReschedule,
  requestViewing,
  type ViewingSlot,
} from '@/services/viewing.service.server'

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function revalidateViewingPaths(listingId?: string) {
  revalidatePath('/dashboard/viewings')
  if (listingId) revalidatePath(`/properties/${listingId}`)
}

export async function requestViewingAction(input: {
  listingId: string
  slots: ViewingSlot[]
  locationNote?: string
}) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!input.slots || input.slots.length === 0) {
    return { error: 'Propose at least one preferred time' }
  }

  try {
    const listing = await getPropertyById(input.listingId)
    if (!listing) return { error: 'Listing not found' }
    if (listing.userId === userId) {
      return { error: "You can't request a viewing on your own listing" }
    }
    if (listing.status !== 'approved' || listing.isSold) {
      return {
        error: 'This listing is not currently accepting viewing requests',
      }
    }

    const viewing = await requestViewing({
      listingId: input.listingId,
      requestedBy: userId,
      hostId: listing.userId,
      requestedSlots: input.slots,
      locationNote: input.locationNote,
    })

    await createNotification({
      profileId: listing.userId,
      type: 'viewing_requested',
      title: `New viewing request for "${listing.title}"`,
      linkHref: '/dashboard/viewings',
    })

    revalidateViewingPaths(input.listingId)
    return { viewing }
  } catch (err) {
    console.error('Request viewing error:', err)
    return { error: errorMessage(err, 'Failed to request viewing') }
  }
}

export async function confirmViewingAction(
  id: string,
  confirmedStart: string,
  confirmedEnd?: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const viewing = await confirmViewing(
      id,
      userId,
      confirmedStart,
      confirmedEnd
    )
    await createNotification({
      profileId: viewing.requestedBy,
      type: 'viewing_confirmed',
      title: `Your viewing for "${viewing.listingTitle ?? 'a listing'}" was confirmed`,
      linkHref: '/dashboard/viewings',
    })
    revalidateViewingPaths(viewing.listingId)
    return { viewing }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to confirm viewing') }
  }
}

export async function cancelViewingAction(id: string, reason?: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const viewing = await cancelViewing(id, userId, reason)
    const otherParty =
      userId === viewing.hostId ? viewing.requestedBy : viewing.hostId
    await createNotification({
      profileId: otherParty,
      type: 'viewing_cancelled',
      title: `A viewing for "${viewing.listingTitle ?? 'a listing'}" was cancelled`,
      linkHref: '/dashboard/viewings',
    })
    revalidateViewingPaths(viewing.listingId)
    return { viewing }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to cancel viewing') }
  }
}

export async function completeViewingAction(id: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const viewing = await completeViewing(id, userId)
    revalidateViewingPaths(viewing.listingId)
    return { viewing }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to complete viewing') }
  }
}

export async function noShowViewingAction(id: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const viewing = await markViewingNoShow(id, userId)
    revalidateViewingPaths(viewing.listingId)
    return { viewing }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to mark no-show') }
  }
}

export async function rescheduleViewingAction(
  id: string,
  slots: ViewingSlot[]
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!slots || slots.length === 0) {
    return { error: 'Propose at least one new time' }
  }

  try {
    const viewing = await proposeReschedule(id, userId, slots)
    revalidateViewingPaths(viewing.listingId)
    return { viewing }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to propose reschedule') }
  }
}
