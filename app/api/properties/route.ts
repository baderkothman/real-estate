import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PLAN_LIMITS } from '@/lib/constants'
import {
  createProperty,
  getAdminProperties,
  getProperties,
  getUserProperties,
} from '@/services/property.service'
import type { ListingType, PropertyFilters } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const isAdmin = searchParams.get('admin') === '1'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '12', 10)
  const status = searchParams.get('status') ?? undefined

  if (isAdmin) {
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

  const session = await auth()
  const result = await getProperties(filters, page, pageSize, session?.user?.id)
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
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

    // Check plan limits
    const userProps = await getUserProperties(session.user.id)
    const activeCount = userProps.filter(
      (p) => p.status !== 'rejected' && !p.isSold
    ).length
    const limit = PLAN_LIMITS[session.user.plan]

    if (activeCount >= limit.maxProperties) {
      return NextResponse.json(
        {
          error: `You have reached the listing limit for your ${session.user.plan} plan (${limit.maxProperties} listings). Please upgrade to add more.`,
        },
        { status: 403 }
      )
    }

    const property = await createProperty({
      ...body,
      userId: session.user.id,
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
