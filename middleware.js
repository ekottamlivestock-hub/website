import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Fail-safe: if basics are missing, allow request through
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  // Initial response
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: getUser() must be called to refresh the session if needed
    // This is the most likely spot for an error if things are misconfigured
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    const pathname = request.nextUrl.pathname

    // Public routes — no auth needed
    const publicRoutes = ['/', '/listings', '/auth/callback', '/about', '/terms', '/privacy']
    const isPublicRoute = publicRoutes.some(route =>
      pathname === route || pathname.startsWith('/listings/')
    )

    if (isPublicRoute) return supabaseResponse

    // Protected routes — require auth
    const protectedRoutes = ['/admin', '/seller', '/sell', '/buyer', '/profile', '/notifications']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

    if (!isProtectedRoute) return supabaseResponse

    // No user or auth error — redirect to home
    if (!user || authError) {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      redirectUrl.searchParams.set('message', 'Please sign in to continue')
      return NextResponse.redirect(redirectUrl)
    }

    // Get user profile for role-based access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, seller_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      redirectUrl.searchParams.set('message', 'Profile not found')
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
      if (pathname !== '/seller/apply') {
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.set('error', 'unauthorized')
        redirectUrl.searchParams.set('message', 'Seller access required')
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Sell page — requires approved seller
    if (pathname === '/sell') {
      if (profile.role === 'admin') return supabaseResponse
      if (profile.seller_status !== 'approved') {
        return NextResponse.redirect(new URL('/seller/apply', request.url))
      }
    }

  } catch (err) {
    // If anything fails, we log it and fail-open to avoid 500
    console.error('CRITICAL: Middleware error caught:', err)
    return NextResponse.next()
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
