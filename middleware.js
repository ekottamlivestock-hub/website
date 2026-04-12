import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Public routes — no auth needed
  const publicRoutes = ['/', '/listings', '/auth/callback']
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith('/listings/')
  )

  if (isPublicRoute) return response

  // Protected routes — require auth
  const protectedRoutes = ['/admin', '/seller', '/sell', '/buyer', '/profile', '/notifications']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (!isProtectedRoute) return response

  // No user — redirect to home
  if (!user) {
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('error', 'unauthorized')
    redirectUrl.searchParams.set('message', 'Please sign in to continue')
    return NextResponse.redirect(redirectUrl)
  }

  // Get user profile for role-based access
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, seller_status')
      .eq('id', user.id)
      .single()

    if (!profile) {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      redirectUrl.searchParams.set('message', 'Profile not found or access denied')
      return NextResponse.redirect(redirectUrl)
    }

    // Admin routes
    if (pathname.startsWith('/admin') && profile.role !== 'admin') {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      redirectUrl.searchParams.set('message', 'Admin access required')
      return NextResponse.redirect(redirectUrl)
    }

    // Seller routes
    if (pathname.startsWith('/seller') && !['seller', 'admin'].includes(profile.role)) {
      // Allow /seller/apply for buyers
      if (pathname !== '/seller/apply') {
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.set('error', 'unauthorized')
        redirectUrl.searchParams.set('message', 'Seller access required')
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Sell page — requires approved seller
    if (pathname === '/sell') {
      if (profile.role === 'admin') return response
      if (profile.seller_status !== 'approved') {
        return NextResponse.redirect(new URL('/seller/apply', request.url))
      }
    }

  } catch (error) {
    console.error('Middleware profile check error:', error)
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('error', 'unauthorized')
    redirectUrl.searchParams.set('message', 'Authorization service unavailable')
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
