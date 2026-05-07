'use server'

import { revalidatePath } from 'next/cache'
import { PLAN_LIMITS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import {
  createProperty,
  deleteProperty,
  featureProperty,
  getAdminProperties,
  getPropertyById,
  getUserProperties,
  toggleSave,
  toggleSold,
  updateProperty,
} from '@/services/property.service'
import { getUserById } from '@/services/user.service'
import type {
  CreatePropertyInput,
  ListingType,
  Property,
  PropertyStatus,
} from '@/types'

type CreatePropertyActionInput = Omit<CreatePropertyInput, 'userId'>

type UpdatePropertyActionInput = Partial<
  Pick<
    Property,
    | 'title'
    | 'city'
    | 'address'
    | 'listingType'
    | 'price'
    | 'bedrooms'
    | 'bathrooms'
    | 'areaSqM'
    | 'description'
    | 'images'
    | 'coverImage'
    | 'status'
  >
>

type AdminPropertyActionInput = {
  action: 'approve' | 'reject' | 'feature' | 'unfeature' | 'delete'
  days?: number
}

const VALID_STATUSES: PropertyStatus[] = ['pending', 'approved', 'rejected']
const VALID_LISTING_TYPES: ListingType[] = ['sale', 'rent']

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

async function getAdminProfile() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return null

  const profile = await getUserById(userId)
  return profile?.role === 'admin' ? profile : null
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function sanitizePropertyInput(
  input: UpdatePropertyActionInput,
  isAdmin: boolean
): Partial<Property> {
  const safeData: Partial<Property> = {}

  if (typeof input.title === 'string') safeData.title = input.title
  if (typeof input.city === 'string') safeData.city = input.city
  if (typeof input.address === 'string') safeData.address = input.address
  if (input.listingType && VALID_LISTING_TYPES.includes(input.listingType)) {
    safeData.listingType = input.listingType
  }
  if (typeof input.price === 'number') safeData.price = input.price
  if (typeof input.bedrooms === 'number') safeData.bedrooms = input.bedrooms
  if (typeof input.bathrooms === 'number') safeData.bathrooms = input.bathrooms
  if (typeof input.areaSqM === 'number') safeData.areaSqM = input.areaSqM
  if (typeof input.description === 'string') {
    safeData.description = input.description
  }
  if (Array.isArray(input.images)) {
    safeData.images = input.images.filter(
      (image): image is string => typeof image === 'string'
    )
  }
  if (typeof input.coverImage === 'string') {
    safeData.coverImage = input.coverImage
  }

  if (isAdmin && input.status && VALID_STATUSES.includes(input.status)) {
    safeData.status = input.status
  } else {
    safeData.status = 'pending'
  }

  return safeData
}

function revalidatePropertyPaths(propertyId?: string, ownerId?: string) {
  revalidatePath('/properties')
  revalidatePath('/dashboard/profile')
  revalidatePath('/admin')
  revalidatePath('/admin/properties')

  if (propertyId) revalidatePath(`/properties/${propertyId}`)
  if (ownerId) revalidatePath(`/users/${ownerId}`)
}

export async function getPropertyAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const property = await getPropertyById(id, user?.id)
    if (!property) return { error: 'Property not found' }
    return { property }
  } catch {
    return { error: 'Property not found' }
  }
}

export async function createPropertyAction(input: CreatePropertyActionInput) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const profile = await getUserById(userId)
    const plan = profile?.plan ?? 'free'
    const userProps = await getUserProperties(userId)
    const activeCount = userProps.filter(
      (property) => property.status !== 'rejected' && !property.isSold
    ).length
    const limit = PLAN_LIMITS[plan]

    if (activeCount >= limit.maxProperties) {
      return {
        error: `You have reached the listing limit for your ${plan} plan (${limit.maxProperties} listings). Please upgrade to add more.`,
      }
    }

    const property = await createProperty({
      ...input,
      userId,
    })

    revalidatePropertyPaths(property.id, userId)

    return { property }
  } catch (err) {
    console.error('Create property error:', err)
    return { error: 'Failed to create property' }
  }
}

export async function updatePropertyAction(
  id: string,
  input: UpdatePropertyActionInput
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  const property = await getPropertyById(id).catch(() => null)
  if (!property) return { error: 'Property not found' }

  const profile = await getUserById(userId)
  const isAdmin = profile?.role === 'admin'
  if (property.userId !== userId && !isAdmin) return { error: 'Forbidden' }

  try {
    const updated = await updateProperty(
      id,
      sanitizePropertyInput(input, isAdmin)
    )
    if (!updated) return { error: 'Property not found' }

    revalidatePropertyPaths(id, property.userId)

    return { property: updated }
  } catch {
    return { error: 'Failed to update property' }
  }
}

export async function deletePropertyAction(id: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  const property = await getPropertyById(id).catch(() => null)
  if (!property) return { error: 'Property not found' }

  const profile = await getUserById(userId)
  if (property.userId !== userId && profile?.role !== 'admin') {
    return { error: 'Forbidden' }
  }

  const deleted = await deleteProperty(id)
  if (!deleted) return { error: 'Failed to delete' }

  revalidatePropertyPaths(id, property.userId)

  return { success: true }
}

export async function toggleSavePropertyAction(id: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const result = await toggleSave(id, userId)
    revalidatePath('/dashboard/profile')
    revalidatePath(`/properties/${id}`)
    return result
  } catch (err) {
    console.error('Toggle save error:', err)
    return { error: 'Failed to toggle save' }
  }
}

export async function toggleSoldPropertyAction(id: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    const result = await toggleSold(id, userId)
    revalidatePropertyPaths(id, userId)
    return result
  } catch (err) {
    return { error: errorMessage(err, 'Failed to toggle sold') }
  }
}

export async function getAdminPropertiesAction(input: {
  page?: number
  pageSize?: number
  status?: string
}) {
  const admin = await getAdminProfile()
  if (!admin) return { error: 'Forbidden' }

  try {
    const result = await getAdminProperties(
      input.page ?? 1,
      input.pageSize ?? 25,
      input.status ?? 'all'
    )
    return { result }
  } catch {
    return { error: 'Failed to load properties' }
  }
}

export async function adminPropertyAction(
  id: string,
  input: AdminPropertyActionInput
) {
  const admin = await getAdminProfile()
  if (!admin) return { error: 'Forbidden' }

  try {
    switch (input.action) {
      case 'approve':
        await updateProperty(id, { status: 'approved' })
        revalidatePropertyPaths(id)
        return { success: true, action: 'approved' }

      case 'reject':
        await updateProperty(id, { status: 'rejected', isFeatured: false })
        revalidatePropertyPaths(id)
        return { success: true, action: 'rejected' }

      case 'feature':
        await featureProperty(id, input.days ?? 30)
        revalidatePropertyPaths(id)
        return { success: true, action: 'featured' }

      case 'unfeature':
        await updateProperty(id, {
          isFeatured: false,
          featuredUntil: undefined,
        })
        revalidatePropertyPaths(id)
        return { success: true, action: 'unfeatured' }

      case 'delete':
        await deleteProperty(id)
        revalidatePropertyPaths(id)
        return { success: true, action: 'deleted' }
    }
  } catch (err) {
    console.error('Admin property action error:', err)
    return { error: 'Action failed' }
  }
}
