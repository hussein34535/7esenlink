import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization')
  const url = req.nextUrl

  // Allow requests to static files, images, and API routes
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.includes('.') || 
      url.pathname === '/api/auth' ||
      url.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Only bypass in development
  if (process.env.NODE_ENV === 'development') {
    console.log("Development mode: Bypassing Basic Auth");
    return NextResponse.next();
  }
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')

    const validUser = process.env.BASIC_AUTH_USER
    const validPass = process.env.BASIC_AUTH_PASSWORD

    if (!validUser || !validPass) {
      console.error('Basic Auth credentials not set in environment variables')
      return NextResponse.next()
    }

    if (user === validUser && pwd === validPass) {
      return NextResponse.next()
    }
  }

  // Return a 401 response prompting for authentication
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
      'Content-Type': 'text/plain',
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
}

