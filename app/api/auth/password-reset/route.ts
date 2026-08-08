import { NextResponse } from 'next/server'
import { createClient } from '@/lib/neon/server'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown
  } | null
  if (!body || typeof body.email !== 'string' || !body.email.trim()) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  const callbackUrl = new URL('/auth/callback', origin)
  callbackUrl.searchParams.set('next', '/auth/reset-password')

  const dbClient = await createClient()
  const { error } = await dbClient.auth.resetPasswordForEmail(
    body.email.trim(),
    { redirectTo: callbackUrl.toString() }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
