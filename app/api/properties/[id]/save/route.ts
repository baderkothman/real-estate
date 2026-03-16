import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toggleSave } from '@/services/property.service'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await toggleSave(id, user.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Toggle save error:', err)
    return NextResponse.json(
      { error: 'Failed to toggle save' },
      { status: 500 }
    )
  }
}
