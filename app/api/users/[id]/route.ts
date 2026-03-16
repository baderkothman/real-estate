import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserById, updateUser } from '@/services/user.service'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getUserById(id)

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Don't expose passwordHash
  const { passwordHash: _, ...safeUser } = user
  return NextResponse.json(safeUser)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only self or admin
  if (session.user.id !== id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    // Remove sensitive fields
    const {
      passwordHash: _,
      role: __,
      ...safeData
    } = body as { passwordHash?: unknown; role?: unknown }
    const updated = await updateUser(id, safeData)

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { passwordHash: _pw, ...safeUser } = updated
    return NextResponse.json(safeUser)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
