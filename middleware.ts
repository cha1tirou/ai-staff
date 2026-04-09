import { NextRequest, NextResponse } from 'next/server'
import { verifySession, COOKIE_NAME } from './lib/auth'

const PUBLIC_PATHS = ['/', '/auth', '/api/auth/register', '/api/auth/login']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/api/auth'))) {
    return NextResponse.next()
  }

  // Check session
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  const session = await verifySession(token)
  if (!session) {
    const res = NextResponse.redirect(new URL('/auth', req.url))
    res.cookies.delete(COOKIE_NAME)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/complete/:path*', '/api/agents/:path*', '/api/user/:path*'],
}
