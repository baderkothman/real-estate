import { ITEMS_PER_PAGE } from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ensureOwnerPartyRole } from '@/services/party.service'
import type {
  CreatePropertyInput,
  ListingLifecycleStatus,
  PaginatedResult,
  Plan,
  Property,
  PropertyFilters,
  PropertyStatus,
} from '@/types'

// ─── DB row types ──────────────────────────────────────────────────────────────
//
// `properties` (physical asset) and `listings` (market advertisement) are
// separate tables — see supabase/migrations/005_split_properties_listings.sql.
// This service reads/writes both, joined, but returns the same `Property`
// shape every existing consumer already expects (`id` = listing id).

interface ProfileJoin {
  name: string
  profile_image: string | null
  plan: Plan
}

interface PropertyPhysicalJoin {
  id: string
  owner_id: string
  address: string | null
  city: string
  lat: number | null
  lng: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_sq_m: number | null
  images: string[]
  cover_image: string | null
}

interface ListingRow {
  id: string
  property_id: string
  listed_by: string
  listing_type: 'sale' | 'rent'
  title: string
  description: string
  price: number
  moderation_status: PropertyStatus
  lifecycle_status: ListingLifecycleStatus
  is_featured: boolean
  featured_until: string | null
  sold_at: string | null
  created_at: string
  properties: PropertyPhysicalJoin | null
  profiles?: ProfileJoin | null
}

const LISTING_SELECT =
  '*, properties!inner(id, owner_id, address, city, lat, lng, bedrooms, bathrooms, area_sq_m, images, cover_image), profiles!listed_by(name, profile_image, plan)'

function isSoldStatus(status: ListingLifecycleStatus) {
  return status === 'sold' || status === 'leased'
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function dbRowToProperty(row: ListingRow, savedSet?: Set<string>): Property {
  const phys = row.properties
  return {
    id: row.id,
    userId: row.listed_by,
    title: row.title,
    city: phys?.city ?? '',
    address: phys?.address ?? undefined,
    listingType: row.listing_type,
    price: Number(row.price),
    bedrooms: phys?.bedrooms ?? undefined,
    bathrooms: phys?.bathrooms ?? undefined,
    areaSqM: phys?.area_sq_m ?? undefined,
    description: row.description,
    status: row.moderation_status,
    isSold: isSoldStatus(row.lifecycle_status),
    soldAt: row.sold_at ? new Date(row.sold_at) : undefined,
    isFeatured: row.is_featured,
    featuredUntil: row.featured_until
      ? new Date(row.featured_until)
      : undefined,
    images: phys?.images ?? [],
    coverImage: phys?.cover_image ?? undefined,
    createdAt: new Date(row.created_at),
    ownerName: row.profiles?.name,
    ownerImage: row.profiles?.profile_image ?? undefined,
    ownerPlan: row.profiles?.plan,
    savedByCurrentUser: savedSet ? savedSet.has(row.id) : false,
    propertyId: phys?.id,
    lat: phys?.lat ?? undefined,
    lng: phys?.lng ?? undefined,
    lifecycleStatus: row.lifecycle_status,
  }
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getProperties(
  filters?: PropertyFilters,
  page = 1,
  pageSize = ITEMS_PER_PAGE,
  currentUserId?: string
): Promise<PaginatedResult<Property>> {
  const supabase = await createClient()

  let query = supabase
    .from('listings')
    .select(LISTING_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Default: approved listings for public view
  const status = filters?.status ?? 'approved'
  query = query.eq('moderation_status', status)

  if (filters?.city) {
    query = query.ilike('properties.city', `%${filters.city}%`)
  }
  if (filters?.listingType) {
    query = query.eq('listing_type', filters.listingType)
  }
  if (filters?.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice)
  }
  if (filters?.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice)
  }
  if (filters?.minBeds !== undefined) {
    query = query.gte('properties.bedrooms', filters.minBeds)
  }
  if (filters?.minBaths !== undefined) {
    query = query.gte('properties.bathrooms', filters.minBaths)
  }
  if (filters?.userId) {
    query = query.eq('listed_by', filters.userId)
  }
  if (filters?.isFeatured !== undefined) {
    query = query.eq('is_featured', filters.isFeatured)
  }
  if (filters?.search) {
    const q = filters.search
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  }

  // Listings the current user has explicitly hidden never appear in their
  // own search results — hiding never deletes anything, it only affects
  // what this one profile sees.
  if (currentUserId) {
    const { data: hidden } = await supabase
      .from('hidden_listings')
      .select('listing_id')
      .eq('profile_id', currentUserId)
    const hiddenIds = (hidden ?? []).map((h) => h.listing_id as string)
    if (hiddenIds.length > 0) {
      query = query.not('id', 'in', `(${hiddenIds.join(',')})`)
    }
  }

  const offset = (page - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  const { data: rows, count, error } = await query
  if (error) throw error

  // Build saved set for current user
  let savedSet = new Set<string>()
  if (currentUserId && rows && rows.length > 0) {
    const { data: saved } = await supabase
      .from('saved_properties')
      .select('property_id')
      .eq('user_id', currentUserId)
      .in(
        'property_id',
        (rows as ListingRow[]).map((r) => r.id)
      )
    savedSet = new Set(
      (saved as { property_id: string }[] | null)?.map((s) => s.property_id) ??
        []
    )
  }

  const total = count ?? 0
  return {
    data: ((rows as ListingRow[]) ?? []).map((row) =>
      dbRowToProperty(row, savedSet)
    ),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getPropertyById(
  id: string,
  currentUserId?: string
): Promise<Property | null> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!row) return null

  let savedByCurrentUser = false
  if (currentUserId) {
    const { data: saved } = await supabase
      .from('saved_properties')
      .select('user_id')
      .eq('user_id', currentUserId)
      .eq('property_id', id)
      .maybeSingle()
    savedByCurrentUser = !!saved
  }

  return dbRowToProperty(
    row as unknown as ListingRow,
    savedByCurrentUser ? new Set([id]) : new Set()
  )
}

export async function getFeaturedProperties(limit = 6): Promise<Property[]> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('is_featured', true)
    .eq('moderation_status', 'approved')
    .eq('lifecycle_status', 'available')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !rows) return []
  return (rows as unknown as ListingRow[]).map((row) => dbRowToProperty(row))
}

export async function getLatestProperties(
  limit = 8,
  excludeUserId?: string
): Promise<Property[]> {
  const supabase = await createClient()

  let query = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('moderation_status', 'approved')
    .eq('lifecycle_status', 'available')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (excludeUserId) {
    query = query.neq('listed_by', excludeUserId)
  }

  const { data: rows, error } = await query
  if (error || !rows) return []
  return (rows as unknown as ListingRow[]).map((row) => dbRowToProperty(row))
}

export async function createProperty(
  data: CreatePropertyInput
): Promise<Property> {
  const supabase = await createClient()

  const { data: newListingId, error } = await supabase.rpc(
    'create_property_listing',
    {
      p_owner_id: data.userId,
      p_address: data.address ?? null,
      p_city: data.city,
      p_bedrooms: data.bedrooms ?? null,
      p_bathrooms: data.bathrooms ?? null,
      p_area_sq_m: data.areaSqM ?? null,
      p_images: data.images,
      p_cover_image: data.coverImage ?? null,
      p_listing_type: data.listingType,
      p_title: data.title,
      p_description: data.description,
      p_price: data.price,
    }
  )

  if (error || !newListingId) {
    throw new Error(error?.message ?? 'Failed to create property')
  }

  await ensureOwnerPartyRole(
    newListingId as string,
    data.userId,
    data.listingType
  )

  const created = await getPropertyById(newListingId as string)
  if (!created) throw new Error('Failed to load created property')
  return created
}

export async function updateProperty(
  id: string,
  data: Partial<Property>
): Promise<Property | null> {
  const supabase = await createClient()

  const listingUpdate: Record<string, unknown> = {}
  if (data.title !== undefined) listingUpdate.title = data.title
  if (data.listingType !== undefined)
    listingUpdate.listing_type = data.listingType
  if (data.price !== undefined) listingUpdate.price = data.price
  if (data.description !== undefined)
    listingUpdate.description = data.description
  if (data.status !== undefined) listingUpdate.moderation_status = data.status
  if (data.isFeatured !== undefined) listingUpdate.is_featured = data.isFeatured
  if (data.featuredUntil !== undefined)
    listingUpdate.featured_until = data.featuredUntil
      ? new Date(data.featuredUntil).toISOString()
      : null

  const propertyUpdate: Record<string, unknown> = {}
  if (data.city !== undefined) propertyUpdate.city = data.city
  if (data.address !== undefined) propertyUpdate.address = data.address
  if (data.bedrooms !== undefined) propertyUpdate.bedrooms = data.bedrooms
  if (data.bathrooms !== undefined) propertyUpdate.bathrooms = data.bathrooms
  if (data.areaSqM !== undefined) propertyUpdate.area_sq_m = data.areaSqM
  if (data.images !== undefined) propertyUpdate.images = data.images
  if (data.coverImage !== undefined)
    propertyUpdate.cover_image = data.coverImage

  let propertyId = data.propertyId
  if (Object.keys(propertyUpdate).length > 0 && !propertyId) {
    const { data: listingRow } = await supabase
      .from('listings')
      .select('property_id')
      .eq('id', id)
      .single()
    propertyId = listingRow?.property_id
  }

  if (Object.keys(listingUpdate).length > 0) {
    const { error } = await supabase
      .from('listings')
      .update(listingUpdate)
      .eq('id', id)
    if (error) throw error
  }

  if (Object.keys(propertyUpdate).length > 0 && propertyId) {
    const { error } = await supabase
      .from('properties')
      .update(propertyUpdate)
      .eq('id', propertyId)
    if (error) throw error
  }

  return getPropertyById(id)
}

export async function deleteProperty(id: string): Promise<boolean> {
  const supabase = await createClient()

  // Single atomic DELETE ... RETURNING round trip instead of a
  // SELECT-then-DELETE pair: the two awaits looked independent to
  // react-doctor/server-sequential-independent-await (the delete doesn't
  // read `listing`), but they aren't — both target the same row, and the
  // delete removes the exact data the select was reading. Racing them
  // with Promise.all would let the delete win before the select observes
  // `property_id`, silently skipping the orphaned-`properties`-row
  // cleanup below. Folding them into one `.delete().select()` call
  // removes the extra round trip entirely (strictly faster than either
  // sequential or parallel two-call versions) and removes the race.
  const { data: listing, error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)
    .select('property_id')
    .maybeSingle()
  if (error) return false

  if (listing?.property_id) {
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', listing.property_id)
    if (!count) {
      await supabase.from('properties').delete().eq('id', listing.property_id)
    }
  }

  return true
}

export async function toggleSave(
  propertyId: string,
  userId: string
): Promise<{ saved: boolean }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('saved_properties')
    .select('user_id')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('saved_properties')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId)
    return { saved: false }
  }

  await supabase
    .from('saved_properties')
    .insert({ user_id: userId, property_id: propertyId })
  return { saved: true }
}

export async function toggleSold(
  propertyId: string,
  userId: string
): Promise<{ isSold: boolean }> {
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('listings')
    .select('listed_by, lifecycle_status, listing_type')
    .eq('id', propertyId)
    .single()

  if (!row || row.listed_by !== userId) throw new Error('Not authorized')

  const currentlySold = isSoldStatus(row.lifecycle_status)
  const nextStatus: ListingLifecycleStatus = currentlySold
    ? 'available'
    : row.listing_type === 'rent'
      ? 'leased'
      : 'sold'

  await supabase
    .from('listings')
    .update({
      lifecycle_status: nextStatus,
      sold_at: currentlySold ? null : new Date().toISOString(),
    })
    .eq('id', propertyId)

  return { isSold: !currentlySold }
}

export async function getUserProperties(
  userId: string,
  includeAll = false
): Promise<Property[]> {
  const supabase = await createClient()

  let query = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('listed_by', userId)
    .order('created_at', { ascending: false })

  if (!includeAll) {
    query = query.neq('moderation_status', 'rejected')
  }

  const { data: rows, error } = await query
  if (error || !rows) return []
  return (rows as unknown as ListingRow[]).map((row) => dbRowToProperty(row))
}

export async function getSavedProperties(userId: string): Promise<Property[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('saved_properties')
    .select(`listings(${LISTING_SELECT})`)
    .eq('user_id', userId)

  if (error || !data) return []

  return (data as unknown as { listings: ListingRow | null }[])
    .map((item) => item.listings)
    .filter(
      (l): l is ListingRow => l !== null && l.moderation_status === 'approved'
    )
    .map((row) => dbRowToProperty(row, new Set([row.id])))
}

export async function getSimilarProperties(
  propertyId: string,
  city: string,
  limit = 3
): Promise<Property[]> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .neq('id', propertyId)
    .eq('properties.city', city)
    .eq('moderation_status', 'approved')
    .eq('lifecycle_status', 'available')
    .limit(limit)

  if (error || !rows) return []
  return (rows as unknown as ListingRow[]).map((row) => dbRowToProperty(row))
}

export async function featureProperty(
  propertyId: string,
  days: number
): Promise<Property | null> {
  // Deliberately the request-scoped client, not the admin client: the
  // privilege-guard trigger on `listings` (migration 008) authorizes
  // is_featured/featured_until changes via is_admin(), which reads
  // auth.uid() — a value only present under the caller's own session. The
  // service-role client carries no JWT/auth.uid() context, so using it here
  // would make the guard trigger see an unauthenticated actor and reject
  // the update. Callers (adminPropertyAction) already verify the caller is
  // an admin before reaching this function, and admin RLS/guard checks
  // allow the write through the caller's own session.
  const supabase = await createClient()
  const until = new Date()
  until.setDate(until.getDate() + days)

  const { error } = await supabase
    .from('listings')
    .update({
      is_featured: true,
      featured_until: until.toISOString(),
    })
    .eq('id', propertyId)

  if (error) throw error
  return getPropertyById(propertyId)
}

export async function getAdminProperties(
  page = 1,
  pageSize = 25,
  statusFilter?: string
): Promise<PaginatedResult<Property>> {
  const admin = createAdminClient()

  let query = admin
    .from('listings')
    .select(LISTING_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'featured') {
      query = query.eq('is_featured', true)
    } else {
      query = query.eq('moderation_status', statusFilter)
    }
  }

  const offset = (page - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  const { data: rows, count, error } = await query
  if (error) throw error

  const total = count ?? 0
  return {
    data: ((rows as unknown as ListingRow[]) ?? []).map((row) =>
      dbRowToProperty(row)
    ),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Admin-client variant of `getProperties`'s filtering, used only by the
 * search-alert dispatch cron (app/api/cron/dispatch-search-alerts/route.ts)
 * — that route runs with no user session, so the request-scoped client
 * `getProperties` normally uses has no cookies to authenticate with.
 * Returns just enough to notify a user about what's new, not a full page.
 */
export async function getNewMatchingListings(
  filters: PropertyFilters,
  since: Date,
  limit = 5
): Promise<{ id: string; title: string }[]> {
  const admin = createAdminClient()

  let query = admin
    .from('listings')
    .select('id, title, properties!inner(city, bedrooms, bathrooms)')
    .eq('moderation_status', 'approved')
    .gt('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.city) query = query.ilike('properties.city', `%${filters.city}%`)
  if (filters.listingType) query = query.eq('listing_type', filters.listingType)
  if (filters.minPrice !== undefined)
    query = query.gte('price', filters.minPrice)
  if (filters.maxPrice !== undefined)
    query = query.lte('price', filters.maxPrice)
  if (filters.minBeds !== undefined)
    query = query.gte('properties.bedrooms', filters.minBeds)
  if (filters.minBaths !== undefined)
    query = query.gte('properties.bathrooms', filters.minBaths)

  const { data, error } = await query
  if (error || !data) return []
  return (data as unknown as { id: string; title: string }[]).map((row) => ({
    id: row.id,
    title: row.title,
  }))
}
