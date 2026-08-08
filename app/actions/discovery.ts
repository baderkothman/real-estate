'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/neon/server'
import {
  addPropertyNote,
  deletePropertyNote,
  deleteSavedSearch,
  hideListing,
  saveSearch,
  setSearchAlertActive,
  unhideListing,
} from '@/services/discovery.service.server'
import type { PropertyFilters } from '@/types'

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

export async function saveSearchAction(name: string, filters: PropertyFilters) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!name || name.trim().length === 0) {
    return { error: 'Give this search a name' }
  }

  try {
    const id = await saveSearch({
      profileId: userId,
      name: name.trim(),
      filters,
    })
    revalidatePath('/dashboard/saved-searches')
    return { id }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to save search') }
  }
}

export async function deleteSavedSearchAction(id: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  await deleteSavedSearch(id, userId)
  revalidatePath('/dashboard/saved-searches')
  return { success: true }
}

export async function setSearchAlertActiveAction(
  savedSearchId: string,
  isActive: boolean
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  await setSearchAlertActive(savedSearchId, isActive)
  revalidatePath('/dashboard/saved-searches')
  return { success: true }
}

export async function addPropertyNoteAction(listingId: string, body: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!body || body.trim().length === 0) {
    return { error: 'Note cannot be empty' }
  }

  try {
    await addPropertyNote({ profileId: userId, listingId, body: body.trim() })
    revalidatePath(`/properties/${listingId}`)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to save note') }
  }
}

export async function deletePropertyNoteAction(id: string, listingId: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  await deletePropertyNote(id, userId)
  revalidatePath(`/properties/${listingId}`)
  return { success: true }
}

export async function hideListingAction(listingId: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await hideListing(listingId, userId)
    revalidatePath('/properties')
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to hide listing') }
  }
}

export async function unhideListingAction(listingId: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  await unhideListing(listingId, userId)
  revalidatePath('/properties')
  return { success: true }
}
