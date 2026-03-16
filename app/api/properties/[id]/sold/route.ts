import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { toggleSold } from '@/services/property.service'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await toggleSold(id, session.user.id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to toggle sold'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
