import 'server-only'

import { createClient } from '@/lib/neon/server'
import type { ListingType } from '@/types'

// Server-only data access: callers authenticate before these RLS-protected writes.

export type ViewingStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface ViewingSlot {
  start: string
  end?: string
}

export interface Viewing {
  id: string
  listingId: string
  requestedBy: string
  hostId: string
  status: ViewingStatus
  requestedSlots: ViewingSlot[]
  confirmedStart?: Date
  confirmedEnd?: Date
  locationNote?: string
  cancellationReason?: string
  createdAt: Date
  // Joined display fields
  listingTitle?: string
  listingCity?: string
  listingCoverImage?: string
  listingType?: ListingType
  requesterName?: string
  requesterImage?: string
  hostName?: string
  hostImage?: string
}

interface ProfileJoin {
  name: string
  profile_image: string | null
}

interface ViewingRow {
  id: string
  listing_id: string
  requested_by: string
  host_id: string
  status: ViewingStatus
  requested_slots: ViewingSlot[]
  confirmed_start: string | null
  confirmed_end: string | null
  location_note: string | null
  cancellation_reason: string | null
  created_at: string
  listings: {
    title: string
    listing_type: ListingType
    properties: { city: string; cover_image: string | null } | null
  } | null
  requester?: ProfileJoin | null
  host?: ProfileJoin | null
}

const VIEWING_SELECT =
  '*, listings(title, listing_type, properties(city, cover_image)), requester:profiles!requested_by(name, profile_image), host:profiles!host_id(name, profile_image)'

function dbRowToViewing(row: ViewingRow): Viewing {
  return {
    id: row.id,
    listingId: row.listing_id,
    requestedBy: row.requested_by,
    hostId: row.host_id,
    status: row.status,
    requestedSlots: row.requested_slots ?? [],
    confirmedStart: row.confirmed_start
      ? new Date(row.confirmed_start)
      : undefined,
    confirmedEnd: row.confirmed_end ? new Date(row.confirmed_end) : undefined,
    locationNote: row.location_note ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    createdAt: new Date(row.created_at),
    listingTitle: row.listings?.title,
    listingCity: row.listings?.properties?.city,
    listingCoverImage: row.listings?.properties?.cover_image ?? undefined,
    listingType: row.listings?.listing_type,
    requesterName: row.requester?.name,
    requesterImage: row.requester?.profile_image ?? undefined,
    hostName: row.host?.name,
    hostImage: row.host?.profile_image ?? undefined,
  }
}

export async function requestViewing(input: {
  listingId: string
  requestedBy: string
  hostId: string
  requestedSlots: ViewingSlot[]
  locationNote?: string
}): Promise<Viewing> {
  const dbClient = await createClient()

  const { data: row, error } = await dbClient
    .from('viewings')
    .insert({
      listing_id: input.listingId,
      requested_by: input.requestedBy,
      host_id: input.hostId,
      requested_slots: input.requestedSlots,
      location_note: input.locationNote ?? null,
    })
    .select(VIEWING_SELECT)
    .single()

  if (error || !row) {
    throw new Error(error?.message ?? 'Failed to request viewing')
  }
  return dbRowToViewing(row as unknown as ViewingRow)
}

async function getViewingRaw(id: string): Promise<ViewingRow | null> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('viewings')
    .select('host_id, requested_by')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as ViewingRow
}

export async function confirmViewing(
  id: string,
  userId: string,
  confirmedStart: string,
  confirmedEnd?: string
): Promise<Viewing> {
  const existing = await getViewingRaw(id)
  if (!existing || existing.host_id !== userId) {
    throw new Error('Not authorized')
  }

  const dbClient = await createClient()
  const { data: row, error } = await dbClient
    .from('viewings')
    .update({
      status: 'confirmed',
      confirmed_start: confirmedStart,
      confirmed_end: confirmedEnd ?? null,
    })
    .eq('id', id)
    .select(VIEWING_SELECT)
    .single()

  if (error || !row)
    throw new Error(error?.message ?? 'Failed to confirm viewing')
  return dbRowToViewing(row as unknown as ViewingRow)
}

export async function cancelViewing(
  id: string,
  userId: string,
  reason?: string
): Promise<Viewing> {
  const existing = await getViewingRaw(id)
  if (
    !existing ||
    (existing.host_id !== userId && existing.requested_by !== userId)
  ) {
    throw new Error('Not authorized')
  }

  const dbClient = await createClient()
  const { data: row, error } = await dbClient
    .from('viewings')
    .update({ status: 'cancelled', cancellation_reason: reason ?? null })
    .eq('id', id)
    .select(VIEWING_SELECT)
    .single()

  if (error || !row)
    throw new Error(error?.message ?? 'Failed to cancel viewing')
  return dbRowToViewing(row as unknown as ViewingRow)
}

export async function completeViewing(
  id: string,
  userId: string
): Promise<Viewing> {
  const existing = await getViewingRaw(id)
  if (!existing || existing.host_id !== userId) {
    throw new Error('Not authorized')
  }

  const dbClient = await createClient()
  const { data: row, error } = await dbClient
    .from('viewings')
    .update({ status: 'completed' })
    .eq('id', id)
    .select(VIEWING_SELECT)
    .single()

  if (error || !row)
    throw new Error(error?.message ?? 'Failed to complete viewing')
  return dbRowToViewing(row as unknown as ViewingRow)
}

export async function markViewingNoShow(
  id: string,
  userId: string
): Promise<Viewing> {
  const existing = await getViewingRaw(id)
  if (!existing || existing.host_id !== userId) {
    throw new Error('Not authorized')
  }

  const dbClient = await createClient()
  const { data: row, error } = await dbClient
    .from('viewings')
    .update({ status: 'no_show' })
    .eq('id', id)
    .select(VIEWING_SELECT)
    .single()

  if (error || !row) throw new Error(error?.message ?? 'Failed to mark no-show')
  return dbRowToViewing(row as unknown as ViewingRow)
}

export async function proposeReschedule(
  id: string,
  userId: string,
  slots: ViewingSlot[]
): Promise<Viewing> {
  const existing = await getViewingRaw(id)
  if (
    !existing ||
    (existing.host_id !== userId && existing.requested_by !== userId)
  ) {
    throw new Error('Not authorized')
  }

  const dbClient = await createClient()
  const { data: row, error } = await dbClient
    .from('viewings')
    .update({
      status: 'requested',
      requested_slots: slots,
      confirmed_start: null,
      confirmed_end: null,
    })
    .eq('id', id)
    .select(VIEWING_SELECT)
    .single()

  if (error || !row)
    throw new Error(error?.message ?? 'Failed to propose reschedule')
  return dbRowToViewing(row as unknown as ViewingRow)
}

export async function getViewingsForRequester(
  userId: string
): Promise<Viewing[]> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('viewings')
    .select(VIEWING_SELECT)
    .eq('requested_by', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as ViewingRow[]).map(dbRowToViewing)
}

export async function getViewingsForHost(userId: string): Promise<Viewing[]> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('viewings')
    .select(VIEWING_SELECT)
    .eq('host_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as ViewingRow[]).map(dbRowToViewing)
}
