import { ITEMS_PER_PAGE } from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type {
  CreatePropertyInput,
  PaginatedResult,
  Plan,
  Property,
  PropertyFilters,
} from '@/types'

// ─── DB row types ──────────────────────────────────────────────────────────────

interface ProfileJoin {
  name: string
  profile_image: string | null
  plan: Plan
}

interface PropertyRow {
  id: string
  user_id: string
  title: string
  city: string
  address: string | null
  listing_type: 'sale' | 'rent'
  price: number
  bedrooms: number | null
  bathrooms: number | null
  area_sq_m: number | null
  description: string
  status: 'pending' | 'approved' | 'rejected'
  is_sold: boolean
  sold_at: string | null
  is_featured: boolean
  featured_until: string | null
  images: string[]
  cover_image: string | null
  created_at: string
  profiles?: ProfileJoin | null
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function dbRowToProperty(row: PropertyRow, savedSet?: Set<string>): Property {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    city: row.city,
    address: row.address ?? undefined,
    listingType: row.listing_type,
    price: Number(row.price),
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    areaSqM: row.area_sq_m ?? undefined,
    description: row.description,
    status: row.status,
    isSold: row.is_sold,
    soldAt: row.sold_at ? new Date(row.sold_at) : undefined,
    isFeatured: row.is_featured,
    featuredUntil: row.featured_until
      ? new Date(row.featured_until)
      : undefined,
    images: row.images,
    coverImage: row.cover_image ?? undefined,
    createdAt: new Date(row.created_at),
    ownerName: row.profiles?.name,
    ownerImage: row.profiles?.profile_image ?? undefined,
    ownerPlan: row.profiles?.plan,
    savedByCurrentUser: savedSet ? savedSet.has(row.id) : false,
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
    .from('properties')
    .select('*, profiles!user_id(name, profile_image, plan)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })

  // Default: approved properties for public view
  const status = filters?.status ?? 'approved'
  query = query.eq('status', status)

  if (filters?.city) {
    query = query.ilike('city', `%${filters.city}%`)
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
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }
  if (filters?.isFeatured !== undefined) {
    query = query.eq('is_featured', filters.isFeatured)
  }
  if (filters?.search) {
    const q = filters.search
    query = query.or(
      `title.ilike.%${q}%,city.ilike.%${q}%,description.ilike.%${q}%`
    )
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
        (rows as PropertyRow[]).map((r) => r.id)
      )
    savedSet = new Set(
      (saved as { property_id: string }[] | null)?.map((s) => s.property_id) ??
        []
    )
  }

  const total = count ?? 0
  return {
    data: ((rows as PropertyRow[]) ?? []).map((row) =>
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
    .from('properties')
    .select('*, profiles!user_id(name, profile_image, plan)')
    .eq('id', id)
    .single()

  if (error || !row) return null

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
    row as PropertyRow,
    savedByCurrentUser ? new Set([id]) : new Set()
  )
}

export async function getFeaturedProperties(limit = 6): Promise<Property[]> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('properties')
    .select('*, profiles!user_id(name, profile_image, plan)')
    .eq('is_featured', true)
    .eq('status', 'approved')
    .eq('is_sold', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !rows) return []
  return (rows as PropertyRow[]).map((row) => dbRowToProperty(row))
}

export async function getLatestProperties(
  limit = 8,
  excludeUserId?: string
): Promise<Property[]> {
  const supabase = await createClient()

  let query = supabase
    .from('properties')
    .select('*, profiles!user_id(name, profile_image, plan)')
    .eq('status', 'approved')
    .eq('is_sold', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId)
  }

  const { data: rows, error } = await query
  if (error || !rows) return []
  return (rows as PropertyRow[]).map((row) => dbRowToProperty(row))
}

export async function createProperty(
  data: CreatePropertyInput
): Promise<Property> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('properties')
    .insert({
      user_id: data.userId,
      title: data.title,
      city: data.city,
      address: data.address ?? null,
      listing_type: data.listingType,
      price: data.price,
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
      area_sq_m: data.areaSqM ?? null,
      description: data.description,
      images: data.images,
      cover_image: data.coverImage ?? null,
      status: 'pending',
      is_sold: false,
      is_featured: false,
    })
    .select('*, profiles!user_id(name, profile_image, plan)')
    .single()

  if (error || !row)
    throw new Error(error?.message ?? 'Failed to create property')
  return dbRowToProperty(row as PropertyRow)
}

export async function updateProperty(
  id: string,
  data: Partial<Property>
): Promise<Property | null> {
  const supabase = await createClient()

  const dbUpdate: Record<string, unknown> = {}
  if (data.title !== undefined) dbUpdate.title = data.title
  if (data.city !== undefined) dbUpdate.city = data.city
  if (data.address !== undefined) dbUpdate.address = data.address
  if (data.listingType !== undefined) dbUpdate.listing_type = data.listingType
  if (data.price !== undefined) dbUpdate.price = data.price
  if (data.bedrooms !== undefined) dbUpdate.bedrooms = data.bedrooms
  if (data.bathrooms !== undefined) dbUpdate.bathrooms = data.bathrooms
  if (data.areaSqM !== undefined) dbUpdate.area_sq_m = data.areaSqM
  if (data.description !== undefined) dbUpdate.description = data.description
  if (data.status !== undefined) dbUpdate.status = data.status
  if (data.isSold !== undefined) dbUpdate.is_sold = data.isSold
  if (data.soldAt !== undefined)
    dbUpdate.sold_at = data.soldAt ? new Date(data.soldAt).toISOString() : null
  if (data.isFeatured !== undefined) dbUpdate.is_featured = data.isFeatured
  if (data.featuredUntil !== undefined)
    dbUpdate.featured_until = data.featuredUntil
      ? new Date(data.featuredUntil).toISOString()
      : null
  if (data.images !== undefined) dbUpdate.images = data.images
  if (data.coverImage !== undefined) dbUpdate.cover_image = data.coverImage

  const { data: row, error } = await supabase
    .from('properties')
    .update(dbUpdate)
    .eq('id', id)
    .select('*, profiles!user_id(name, profile_image, plan)')
    .single()

  if (error || !row) return null
  return dbRowToProperty(row as PropertyRow)
}

export async function deleteProperty(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('properties').delete().eq('id', id)
  return !error
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
    .from('properties')
    .select('user_id, is_sold')
    .eq('id', propertyId)
    .single()

  if (!row || row.user_id !== userId) throw new Error('Not authorized')

  const newSold = !row.is_sold
  await supabase
    .from('properties')
    .update({
      is_sold: newSold,
      sold_at: newSold ? new Date().toISOString() : null,
    })
    .eq('id', propertyId)

  return { isSold: newSold }
}

export async function getUserProperties(
  userId: string,
  includeAll = false
): Promise<Property[]> {
  const supabase = await createClient()

  let query = supabase
    .from('properties')
    .select('*, profiles!user_id(name, profile_image, plan)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!includeAll) {
    query = query.neq('status', 'rejected')
  }

  const { data: rows, error } = await query
  if (error || !rows) return []
  return (rows as PropertyRow[]).map((row) => dbRowToProperty(row))
}

export async function getSavedProperties(userId: string): Promise<Property[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('saved_properties')
    .select('properties(*, profiles!user_id(name, profile_image, plan))')
    .eq('user_id', userId)

  if (error || !data) return []

  return (data as unknown as { properties: PropertyRow | null }[])
    .map((item) => item.properties)
    .filter((p): p is PropertyRow => p !== null && p.status === 'approved')
    .map((row) => dbRowToProperty(row, new Set([row.id])))
}

export async function getSimilarProperties(
  propertyId: string,
  city: string,
  limit = 3
): Promise<Property[]> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('properties')
    .select('*, profiles!user_id(name, profile_image, plan)')
    .neq('id', propertyId)
    .eq('city', city)
    .eq('status', 'approved')
    .eq('is_sold', false)
    .limit(limit)

  if (error || !rows) return []
  return (rows as PropertyRow[]).map((row) => dbRowToProperty(row))
}

export async function featureProperty(
  propertyId: string,
  days: number
): Promise<Property | null> {
  const admin = createAdminClient()
  const until = new Date()
  until.setDate(until.getDate() + days)

  const { data: row, error } = await admin
    .from('properties')
    .update({
      is_featured: true,
      featured_until: until.toISOString(),
    })
    .eq('id', propertyId)
    .select('*, profiles!user_id(name, profile_image, plan)')
    .single()

  if (error || !row) return null
  return dbRowToProperty(row as PropertyRow)
}

export async function getAdminProperties(
  page = 1,
  pageSize = 25,
  statusFilter?: string
): Promise<PaginatedResult<Property>> {
  const admin = createAdminClient()

  let query = admin
    .from('properties')
    .select('*, profiles!user_id(name, profile_image, plan)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })

  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'featured') {
      query = query.eq('is_featured', true)
    } else {
      query = query.eq('status', statusFilter)
    }
  }

  const offset = (page - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  const { data: rows, count, error } = await query
  if (error) throw error

  const total = count ?? 0
  return {
    data: ((rows as PropertyRow[]) ?? []).map((row) => dbRowToProperty(row)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
