import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  deleteProperty,
  featureProperty,
  updateProperty,
} from '@/services/property.service'
import { getUserById } from '@/services/user.service'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
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

  try {
    const body = (await request.json()) as {
      action: 'approve' | 'reject' | 'feature' | 'unfeature' | 'delete'
      days?: number
    }

    switch (body.action) {
      case 'approve':
        await updateProperty(id, { status: 'approved' })
        return NextResponse.json({ success: true, action: 'approved' })

      case 'reject':
        await updateProperty(id, { status: 'rejected', isFeatured: false })
        return NextResponse.json({ success: true, action: 'rejected' })

      case 'feature':
        await featureProperty(id, body.days ?? 30)
        return NextResponse.json({ success: true, action: 'featured' })

      case 'unfeature':
        await updateProperty(id, {
          isFeatured: false,
          featuredUntil: undefined,
        })
        return NextResponse.json({ success: true, action: 'unfeatured' })

      case 'delete':
        await deleteProperty(id)
        return NextResponse.json({ success: true, action: 'deleted' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('Admin property action error:', err)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
