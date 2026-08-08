import { type NextRequest, NextResponse } from 'next/server'
import { auth, hasNeonAuthEnv } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/neon/admin'

function loginRedirect(request: NextRequest) {
  const loginUrl = new URL('/auth/login', request.url)
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  if (!isProtected) {
    return NextResponse.next()
  }

  if (!hasNeonAuthEnv()) {
    console.error('Neon Auth is not configured for protected route access')
    return loginRedirect(request)
  }

  const { data: session, error } = await auth.getSession()
  const user = session?.user

  if (error || !user) {
    return loginRedirect(request)
  }

  if (pathname.startsWith('/admin')) {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not configured for /admin')
      return NextResponse.redirect(new URL('/', request.url))
    }

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
