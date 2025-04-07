import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization')
  const url = req.nextUrl

  // Allow requests to static files and images
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.includes('.') || 
      url.pathname === '/api/auth') {
    return NextResponse.next()
  }

  // Temporarily disable development bypass for testing
  // if (process.env.NODE_ENV === 'development') {
  //   console.log("Development mode: Bypassing Basic Auth");
  //   return NextResponse.next();
  // }
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')

    const validUser = process.env.BASIC_AUTH_USER
    const validPass = process.env.BASIC_AUTH_PASSWORD // Updated to match .env.local

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
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

