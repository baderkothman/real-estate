import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserById } from '@/services/user.service'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getUserById(user.id)
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
    profileImage: profile.profileImage,
    bio: profile.bio,
    plan: profile.plan,
    role: profile.role,
    isBanned: profile.isBanned,
  })
}
