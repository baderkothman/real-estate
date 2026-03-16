import { mockProperties } from '@/data/mock-properties'
import { ITEMS_PER_PAGE } from '@/lib/constants'
import type {
  CreatePropertyInput,
  PaginatedResult,
  Property,
  PropertyFilters,
} from '@/types'

// In-memory store (resets on server restart in dev)
let propertiesStore: Property[] = [...mockProperties]

// Saved properties store: Map<userId, Set<propertyId>>
const savedStore = new Map<string, Set<string>>()

function applyFilters(
  props: Property[],
  filters?: PropertyFilters
): Property[] {
  if (!filters) return props

  return props.filter((p) => {
    if (
      filters.city &&
      !p.city.toLowerCase().includes(filters.city.toLowerCase())
    ) {
      return false
    }
    if (filters.listingType && p.listingType !== filters.listingType) {
      return false
    }
    if (filters.minPrice !== undefined && p.price < filters.minPrice) {
      return false
    }
    if (filters.maxPrice !== undefined && p.price > filters.maxPrice) {
      return false
    }
    if (filters.status && p.status !== filters.status) {
      return false
    }
    if (filters.userId && p.userId !== filters.userId) {
      return false
    }
    if (
      filters.isFeatured !== undefined &&
      p.isFeatured !== filters.isFeatured
    ) {
      return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (
        !p.title.toLowerCase().includes(q) &&
        !p.city.toLowerCase().includes(q) &&
        !p.description.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    return true
  })
}

export async function getProperties(
  filters?: PropertyFilters,
  page = 1,
  pageSize = ITEMS_PER_PAGE,
  currentUserId?: string
): Promise<PaginatedResult<Property>> {
  // Default: only approved properties for public view
  const baseFilter: PropertyFilters = {
    status: filters?.status ?? 'approved',
    ...filters,
  }

  const filtered = applyFilters(propertiesStore, baseFilter)
  // Sort by createdAt desc
  const sorted = filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const total = sorted.length
  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize
  const data = sorted.slice(offset, offset + pageSize).map((p) => ({
    ...p,
    savedByCurrentUser: currentUserId
      ? (savedStore.get(currentUserId)?.has(p.id) ?? false)
      : false,
  }))

  return { data, total, page, pageSize, totalPages }
}

export async function getPropertyById(
  id: string,
  currentUserId?: string
): Promise<Property | null> {
  const prop = propertiesStore.find((p) => p.id === id) ?? null
  if (!prop) return null
  return {
    ...prop,
    savedByCurrentUser: currentUserId
      ? (savedStore.get(currentUserId)?.has(id) ?? false)
      : false,
  }
}

export async function getFeaturedProperties(limit = 6): Promise<Property[]> {
  return propertiesStore
    .filter((p) => p.isFeatured && p.status === 'approved' && !p.isSold)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit)
}

export async function getLatestProperties(
  limit = 8,
  excludeUserId?: string
): Promise<Property[]> {
  return propertiesStore
    .filter(
      (p) =>
        p.status === 'approved' &&
        !p.isSold &&
        (excludeUserId ? p.userId !== excludeUserId : true)
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit)
}

export async function createProperty(
  data: CreatePropertyInput
): Promise<Property> {
  const newProperty: Property = {
    id: `p${Date.now()}`,
    ...data,
    status: 'pending',
    isSold: false,
    isFeatured: false,
    createdAt: new Date(),
  }
  propertiesStore = [newProperty, ...propertiesStore]
  return newProperty
}

export async function updateProperty(
  id: string,
  data: Partial<Property>
): Promise<Property | null> {
  const idx = propertiesStore.findIndex((p) => p.id === id)
  if (idx === -1) return null
  propertiesStore[idx] = { ...propertiesStore[idx], ...data }
  return propertiesStore[idx]
}

export async function deleteProperty(id: string): Promise<boolean> {
  const before = propertiesStore.length
  propertiesStore = propertiesStore.filter((p) => p.id !== id)
  return propertiesStore.length < before
}

export async function toggleSave(
  propertyId: string,
  userId: string
): Promise<{ saved: boolean }> {
  if (!savedStore.has(userId)) {
    savedStore.set(userId, new Set())
  }
  const userSaved = savedStore.get(userId)!
  if (userSaved.has(propertyId)) {
    userSaved.delete(propertyId)
    return { saved: false }
  } else {
    userSaved.add(propertyId)
    return { saved: true }
  }
}

export async function toggleSold(
  propertyId: string,
  userId: string
): Promise<{ isSold: boolean }> {
  const prop = propertiesStore.find((p) => p.id === propertyId)
  if (!prop || prop.userId !== userId) throw new Error('Not authorized')
  const newSold = !prop.isSold
  await updateProperty(propertyId, {
    isSold: newSold,
    soldAt: newSold ? new Date() : undefined,
  })
  return { isSold: newSold }
}

export async function getUserProperties(
  userId: string,
  includeAll = false
): Promise<Property[]> {
  return propertiesStore
    .filter((p) => {
      if (p.userId !== userId) return false
      if (!includeAll && p.status === 'rejected') return false
      return true
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
}

export async function getSavedProperties(userId: string): Promise<Property[]> {
  const userSaved = savedStore.get(userId)
  if (!userSaved || userSaved.size === 0) return []
  return propertiesStore.filter(
    (p) => userSaved.has(p.id) && p.status === 'approved'
  )
}

export async function getSimilarProperties(
  propertyId: string,
  city: string,
  limit = 3
): Promise<Property[]> {
  return propertiesStore
    .filter(
      (p) =>
        p.id !== propertyId &&
        p.city === city &&
        p.status === 'approved' &&
        !p.isSold
    )
    .slice(0, limit)
}

export async function featureProperty(
  propertyId: string,
  days: number
): Promise<Property | null> {
  const until = new Date()
  until.setDate(until.getDate() + days)
  return updateProperty(propertyId, {
    isFeatured: true,
    featuredUntil: until,
  })
}

export async function getAdminProperties(
  page = 1,
  pageSize = 25,
  statusFilter?: string
): Promise<PaginatedResult<Property>> {
  let filtered = propertiesStore
  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'featured') {
      filtered = filtered.filter((p) => p.isFeatured)
    } else {
      filtered = filtered.filter((p) => p.status === statusFilter)
    }
  }
  const sorted = filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const total = sorted.length
  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize
  const data = sorted.slice(offset, offset + pageSize)
  return { data, total, page, pageSize, totalPages }
}
