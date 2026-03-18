import { type NextRequest, NextResponse } from 'next/server'
import { PLAN_LIMITS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import {
  createProperty,
  getAdminProperties,
  getProperties,
  getUserProperties,
} from '@/services/property.service'
import { getUserById } from '@/services/user.service'
import type { ListingType, PropertyFilters } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const isAdmin = searchParams.get('admin') === '1'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '12', 10)
  const status = searchParams.get('status') ?? undefined
  const supabase = await createClient()

  if (isAdmin) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const profile = await getUserById(user.id)
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await getAdminProperties(page, pageSize, status ?? 'all')
    return NextResponse.json(result)
  }

  const filters: PropertyFilters = {
    city: searchParams.get('city') ?? undefined,
    listingType: (searchParams.get('listingType') as ListingType) || undefined,
    minPrice: searchParams.get('minPrice')
      ? Number(searchParams.get('minPrice'))
      : undefined,
    maxPrice: searchParams.get('maxPrice')
      ? Number(searchParams.get('maxPrice'))
      : undefined,
    search: searchParams.get('search') ?? undefined,
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const result = await getProperties(filters, page, pageSize, user?.id)
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as {
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
    }

    // Get user's plan from profiles
    const profile = await getUserById(user.id)
    const plan = profile?.plan ?? 'free'

    // Check plan limits
    const userProps = await getUserProperties(user.id)
    const activeCount = userProps.filter(
      (p) => p.status !== 'rejected' && !p.isSold
    ).length
    const limit = PLAN_LIMITS[plan]

    if (activeCount >= limit.maxProperties) {
      return NextResponse.json(
        {
          error: `You have reached the listing limit for your ${plan} plan (${limit.maxProperties} listings). Please upgrade to add more.`,
        },
        { status: 403 }
      )
    }

    const property = await createProperty({
      ...body,
      userId: user.id,
    })

    return NextResponse.json(property, { status: 201 })
  } catch (err) {
    console.error('Create property error:', err)
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}
