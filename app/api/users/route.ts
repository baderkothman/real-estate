import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createUser,
  getPublicUsers,
  getUserById,
  getUsers,
} from '@/services/user.service'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const isAdmin = searchParams.get('admin') === '1'
  const search = searchParams.get('search') ?? undefined
  const plan = searchParams.get('plan') ?? undefined
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '12', 10)

  if (isAdmin) {
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
    const result = await getUsers(search, plan, page, pageSize)
    return NextResponse.json(result)
  }

  const result = await getPublicUsers(search, plan, page, pageSize)
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name: string
      email: string
      phone: string
      password: string
      bio?: string
    }

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    const user = await createUser(body)
    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create user'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
