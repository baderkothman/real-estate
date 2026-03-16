import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  deleteProperty,
  getPropertyById,
  updateProperty,
} from '@/services/property.service'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()
  const property = await getPropertyById(id, session?.user?.id)

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  return NextResponse.json(property)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const property = await getPropertyById(id)
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  // Only owner or admin can update
  if (property.userId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const updated = await updateProperty(id, body)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const property = await getPropertyById(id)
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  if (property.userId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const deleted = await deleteProperty(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
