import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { banUser, changeUserPlan } from '@/services/user.service'
import type { Plan } from '@/types'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth()

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as {
      action: 'ban' | 'unban' | 'change_plan'
      plan?: Plan
    }

    switch (body.action) {
      case 'ban':
        await banUser(id, true)
        return NextResponse.json({ success: true, action: 'banned' })

      case 'unban':
        await banUser(id, false)
        return NextResponse.json({ success: true, action: 'unbanned' })

      case 'change_plan':
        if (!body.plan) {
          return NextResponse.json(
            { error: 'Plan is required' },
            { status: 400 }
          )
        }
        await changeUserPlan(id, body.plan)
        return NextResponse.json({
          success: true,
          action: 'plan_changed',
          plan: body.plan,
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('Admin user action error:', err)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
