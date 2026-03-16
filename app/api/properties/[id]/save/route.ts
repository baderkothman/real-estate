import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { toggleSave } from '@/services/property.service'

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
    const result = await toggleSave(id, session.user.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Toggle save error:', err)
    return NextResponse.json(
      { error: 'Failed to toggle save' },
      { status: 500 }
    )
  }
}
