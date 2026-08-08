// ─── User Types ────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin'
export type Plan = 'free' | 'pro' | 'agency'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  profileImage?: string
  bio?: string
  plan: Plan
  role: UserRole
  isBanned: boolean
  createdAt: Date
}

// ─── Property Types ─────────────────────────────────────────────────────────────
//
// `properties` (physical asset) and `listings` (market advertisement) are
// separate tables in the database (see dbClient/migrations/005_split_properties_listings.sql).
// The `Property` type below is the historical, still-supported flattened
// shape: it represents a *listing* joined with its underlying physical
// property, and every existing consumer keeps working unchanged against it.
// `id` refers to the listing id (what routes like /properties/[id] use).
// New split-aware fields are additive/optional so nothing that already reads
// this type needs to change.

export type PropertyStatus = 'pending' | 'approved' | 'rejected'
export type ListingType = 'sale' | 'rent'
export type ListingLifecycleStatus =
  | 'available'
  | 'under_offer'
  | 'under_contract'
  | 'sold'
  | 'leased'
  | 'withdrawn'
  | 'expired'
  | 'archived'

export interface Property {
  id: string
  userId: string
  title: string
  city: string
  address?: string
  listingType: ListingType
  price: number
  bedrooms?: number
  bathrooms?: number
  areaSqM?: number
  description: string
  status: PropertyStatus
  isSold: boolean
  soldAt?: Date
  isFeatured: boolean
  featuredUntil?: Date
  images: string[]
  coverImage?: string
  createdAt: Date
  // Joined fields
  ownerName?: string
  ownerImage?: string
  ownerPlan?: Plan
  savedByCurrentUser?: boolean
  // Split-schema fields (optional — new consumers may use these)
  propertyId?: string
  lat?: number
  lng?: number
  lifecycleStatus?: ListingLifecycleStatus
}

export interface PropertyFilters {
  city?: string
  listingType?: ListingType | ''
  minPrice?: number
  maxPrice?: number
  minBeds?: number
  minBaths?: number
  status?: PropertyStatus
  userId?: string
  isFeatured?: boolean
  search?: string
}

// ─── Party Role Types ───────────────────────────────────────────────────────────
//
// A profile's buyer/seller/landlord/tenant/agent role is scoped per-listing
// (or, once transactions exist, per-transaction) rather than being a global
// account attribute — one account can be a seller on one listing and a
// buyer on another. See dbClient/migrations/006_party_roles_audit_events.sql.

export type PartyRoleType =
  | 'buyer'
  | 'seller'
  | 'landlord'
  | 'tenant'
  | 'listing_agent'
  | 'buyer_agent'
  | 'other'

export interface PartyRoleSummary {
  role: PartyRoleType
  count: number
}

// ─── Plan & Pricing Types ───────────────────────────────────────────────────────

export interface PlanLimits {
  maxProperties: number
  maxImages: number
}

export interface PlanPricing {
  month: number
  quarter: number
  year: number
}

// ─── Analytics Types ────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalUsers: number
  totalProperties: number
  approvedProperties: number
  pendingProperties: number
  featuredProperties: number
  soldProperties: number
}

// Transaction funnel: listings -> viewings -> offers -> transactions -> closed.
export interface TransactionFunnel {
  listingsCount: number
  viewingsCount: number
  offersCount: number
  transactionsCount: number
  closedTransactionsCount: number
}

// ─── Pagination ─────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Create Inputs ──────────────────────────────────────────────────────────────

export interface CreatePropertyInput {
  userId: string
  title: string
  city: string
  address?: string
  listingType: ListingType
  price: number
  bedrooms?: number
  bathrooms?: number
  areaSqM?: number
  description: string
  images: string[]
  coverImage?: string
}

export interface CreateUserInput {
  name: string
  email: string
  phone: string
  password: string
  bio?: string
}

// ─── Testimonial ────────────────────────────────────────────────────────────────

export interface Testimonial {
  id: string
  name: string
  role: string
  avatar: string
  quote: string
  rating: number
}
