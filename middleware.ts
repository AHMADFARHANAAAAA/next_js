import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Protected admin routes
    if (pathname.startsWith('/admin')) {
      if (!token?.role || !['ADMIN', 'SUPERADMIN'].includes(token.role)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    // Protected superadmin routes
    if (pathname.startsWith('/superadmin')) {
      if (!token?.role || token.role !== 'SUPERADMIN') {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Always allow access to home page
        if (pathname === '/') {
          return true
        }
        
        // Require authentication for protected routes
        if (pathname.startsWith('/admin') || 
            pathname.startsWith('/superadmin')) {
          return !!token
        }
        
        return true
      }
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/superadmin/:path*']
}