import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'odyssey_session'
const SESSION_VALUE = 'authenticated'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get(SESSION_COOKIE)
  const isAuthenticated = session?.value === SESSION_VALUE

  // Allow login page and auth API
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    // If already authenticated, redirect to projects
    if (isAuthenticated && pathname === '/login') {
      return NextResponse.redirect(new URL('/projects', request.url))
    }
    return NextResponse.next()
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/uploads')) {
    return NextResponse.next()
  }

  // Protect all other routes
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
