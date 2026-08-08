import { createClient } from '@/lib/neon/server'

export type OfferStatus =
  | 'submitted'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'

export interface OfferRevision {
  id: string
  revisionNumber: number
  proposedBy: string
  price: number
  contingencies: Record<string, unknown>
  closingDate?: string
  expiresAt?: Date
  message?: string
  createdAt: Date
}

export interface Offer {
  id: string
  listingId: string
  status: OfferStatus
  buyerProfileId: string
  buyerName?: string
  buyerImage?: string
  sellerProfileId: string
  sellerName?: string
  sellerImage?: string
  currentRevision?: OfferRevision
  listingTitle?: string
  listingCity?: string
  listingCoverImage?: string
  createdAt: Date
}

interface ProfileJoin {
  name: string
  profile_image: string | null
}

interface PartyJoin {
  profile_id: string
  profiles: ProfileJoin | null
}

interface RevisionJoin {
  id: string
  revision_number: number
  proposed_by: string
  price: number
  contingencies: Record<string, unknown>
  closing_date: string | null
  expires_at: string | null
  message: string | null
  created_at: string
}

interface OfferRow {
  id: string
  listing_id: string
  status: OfferStatus
  created_at: string
  listings: {
    title: string
    properties: { city: string; cover_image: string | null } | null
  } | null
  buyer: PartyJoin | null
  seller: PartyJoin | null
  current_revision: RevisionJoin | null
}

const OFFER_SELECT =
  '*, listings(title, properties(city, cover_image)), buyer:party_roles!buyer_party_id(profile_id, profiles(name, profile_image)), seller:party_roles!seller_party_id(profile_id, profiles(name, profile_image)), current_revision:offer_revisions!current_revision_id(id, revision_number, proposed_by, price, contingencies, closing_date, expires_at, message, created_at)'

function dbRowToOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    listingId: row.listing_id,
    status: row.status,
    buyerProfileId: row.buyer?.profile_id ?? '',
    buyerName: row.buyer?.profiles?.name,
    buyerImage: row.buyer?.profiles?.profile_image ?? undefined,
    sellerProfileId: row.seller?.profile_id ?? '',
    sellerName: row.seller?.profiles?.name,
    sellerImage: row.seller?.profiles?.profile_image ?? undefined,
    currentRevision: row.current_revision
      ? {
          id: row.current_revision.id,
          revisionNumber: row.current_revision.revision_number,
          proposedBy: row.current_revision.proposed_by,
          price: Number(row.current_revision.price),
          contingencies: row.current_revision.contingencies ?? {},
          closingDate: row.current_revision.closing_date ?? undefined,
          expiresAt: row.current_revision.expires_at
            ? new Date(row.current_revision.expires_at)
            : undefined,
          message: row.current_revision.message ?? undefined,
          createdAt: new Date(row.current_revision.created_at),
        }
      : undefined,
    listingTitle: row.listings?.title,
    listingCity: row.listings?.properties?.city,
    listingCoverImage: row.listings?.properties?.cover_image ?? undefined,
    createdAt: new Date(row.created_at),
  }
}

export async function getOfferById(id: string): Promise<Offer | null> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('offers')
    .select(OFFER_SELECT)
    .eq('id', id)
    .single()
  if (error || !data) return null
  return dbRowToOffer(data as unknown as OfferRow)
}

export async function submitOffer(input: {
  listingId: string
  price: number
  contingencies?: Record<string, unknown>
  closingDate?: string
  expiresAt?: string
  message?: string
}): Promise<string> {
  const dbClient = await createClient()
  const { data, error } = await dbClient.rpc('submit_offer', {
    p_listing_id: input.listingId,
    p_price: input.price,
    p_contingencies: input.contingencies ?? {},
    p_closing_date: input.closingDate ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_message: input.message ?? null,
  })
  if (error || !data)
    throw new Error(error?.message ?? 'Failed to submit offer')
  return data as string
}

export async function counterOffer(input: {
  offerId: string
  price: number
  contingencies?: Record<string, unknown>
  closingDate?: string
  expiresAt?: string
  message?: string
}): Promise<string> {
  const dbClient = await createClient()
  const { data, error } = await dbClient.rpc('counter_offer', {
    p_offer_id: input.offerId,
    p_price: input.price,
    p_contingencies: input.contingencies ?? {},
    p_closing_date: input.closingDate ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_message: input.message ?? null,
  })
  if (error || !data)
    throw new Error(error?.message ?? 'Failed to submit counteroffer')
  return data as string
}

export async function acceptOffer(offerId: string): Promise<string> {
  const dbClient = await createClient()
  const { data, error } = await dbClient.rpc('accept_offer', {
    p_offer_id: offerId,
  })
  if (error || !data)
    throw new Error(error?.message ?? 'Failed to accept offer')
  return data as string
}

export async function rejectOffer(offerId: string): Promise<void> {
  const dbClient = await createClient()
  const { error } = await dbClient
    .from('offers')
    .update({ status: 'rejected' })
    .eq('id', offerId)
  if (error) throw new Error(error.message)
}

export async function withdrawOffer(offerId: string): Promise<void> {
  const dbClient = await createClient()
  const { error } = await dbClient
    .from('offers')
    .update({ status: 'withdrawn' })
    .eq('id', offerId)
  if (error) throw new Error(error.message)
}

export async function getRevisionsForOffer(
  offerId: string
): Promise<OfferRevision[]> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('offer_revisions')
    .select('*')
    .eq('offer_id', offerId)
    .order('revision_number', { ascending: true })

  if (error || !data) return []
  return (data as unknown as RevisionJoin[]).map((row) => ({
    id: row.id,
    revisionNumber: row.revision_number,
    proposedBy: row.proposed_by,
    price: Number(row.price),
    contingencies: row.contingencies ?? {},
    closingDate: row.closing_date ?? undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    message: row.message ?? undefined,
    createdAt: new Date(row.created_at),
  }))
}

/** Offers where the given profile holds the buyer party role — "Your Offers". */
export async function getOffersMade(userId: string): Promise<Offer[]> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('offers')
    .select(
      `${OFFER_SELECT}, buyer:party_roles!buyer_party_id!inner(profile_id, profiles(name, profile_image))`
    )
    .eq('buyer.profile_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as OfferRow[]).map(dbRowToOffer)
}

/** Offers where the given profile holds the seller party role — "Offers Received". */
export async function getOffersReceived(userId: string): Promise<Offer[]> {
  const dbClient = await createClient()
  const { data, error } = await dbClient
    .from('offers')
    .select(
      `${OFFER_SELECT}, seller:party_roles!seller_party_id!inner(profile_id, profiles(name, profile_image))`
    )
    .eq('seller.profile_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as OfferRow[]).map(dbRowToOffer)
}
