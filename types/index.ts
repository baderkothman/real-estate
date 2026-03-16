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

export interface UserSession {
  id: string
  name: string
  email: string
  role: UserRole
  plan: Plan
  profileImage?: string
}

// ─── Property Types ─────────────────────────────────────────────────────────────

export type PropertyStatus = 'pending' | 'approved' | 'rejected'
export type ListingType = 'sale' | 'rent'

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
}

export interface PropertyFilters {
  city?: string
  listingType?: ListingType | ''
  minPrice?: number
  maxPrice?: number
  status?: PropertyStatus
  userId?: string
  isFeatured?: boolean
  search?: string
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

export interface PropertyStatRow {
  label: string
  count: number
  percentage: number
}

// ─── Saved Property ─────────────────────────────────────────────────────────────

export interface SavedProperty {
  userId: string
  propertyId: string
  savedAt: Date
}

// ─── Pagination ─────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Toast ──────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
  duration?: number
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
