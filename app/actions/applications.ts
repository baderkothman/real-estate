'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  approveRentalApplication,
  conditionallyApproveApplication,
  getApplicationById,
  markApplicationUnderReview,
  rejectRentalApplication,
  submitRentalApplication,
  withdrawRentalApplication,
} from '@/services/application.service'
import { createNotification } from '@/services/notification.service'
import { getPropertyById } from '@/services/property.service'

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

function revalidateApplicationPaths(listingId?: string) {
  revalidatePath('/dashboard/applications')
  if (listingId) revalidatePath(`/properties/${listingId}`)
}

export async function submitRentalApplicationAction(input: {
  listingId: string
  monthlyIncome?: number
  employmentNote?: string
  occupantsCount?: number
  hasPets: boolean
  moveInDate?: string
  notes?: string
}) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const applicationId = await submitRentalApplication(input)
    const listing = await getPropertyById(input.listingId)
    if (listing) {
      await createNotification({
        profileId: listing.userId,
        type: 'application_received',
        title: `New rental application for "${listing.title}"`,
        linkHref: '/dashboard/applications',
      })
    }
    revalidateApplicationPaths(input.listingId)
    return { applicationId }
  } catch (err) {
    console.error('Submit rental application error:', err)
    return { error: errorMessage(err, 'Failed to submit application') }
  }
}

export async function markApplicationUnderReviewAction(
  id: string,
  listingId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await markApplicationUnderReview(id)
    revalidateApplicationPaths(listingId)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to update application') }
  }
}

export async function approveRentalApplicationAction(
  id: string,
  listingId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const applicationBefore = await getApplicationById(id)
    const transactionId = await approveRentalApplication(id)
    if (applicationBefore) {
      await createNotification({
        profileId: applicationBefore.applicantProfileId,
        type: 'application_approved',
        title: `Your application for "${applicationBefore.listingTitle ?? 'a listing'}" was approved`,
        linkHref: `/dashboard/transactions/${transactionId}`,
      })
    }
    revalidateApplicationPaths(listingId)
    return { transactionId }
  } catch (err) {
    console.error('Approve rental application error:', err)
    return { error: errorMessage(err, 'Failed to approve application') }
  }
}

export async function conditionallyApproveApplicationAction(
  id: string,
  listingId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await conditionallyApproveApplication(id)
    revalidateApplicationPaths(listingId)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to update application') }
  }
}

export async function rejectRentalApplicationAction(
  id: string,
  listingId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const application = await getApplicationById(id)
    await rejectRentalApplication(id)
    if (application) {
      await createNotification({
        profileId: application.applicantProfileId,
        type: 'application_rejected',
        title: `Your application for "${application.listingTitle ?? 'a listing'}" was rejected`,
        linkHref: '/dashboard/applications',
      })
    }
    revalidateApplicationPaths(listingId)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to reject application') }
  }
}

export async function withdrawRentalApplicationAction(
  id: string,
  listingId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await withdrawRentalApplication(id)
    revalidateApplicationPaths(listingId)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to withdraw application') }
  }
}
