import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Profile is fetched fresh on every protected-route request. We previously
// cached role/seller_status in an `ek_profile` cookie for 10 minutes, but
// that meant a newly-approved seller stayed blocked at the middleware layer
// for up to 10 minutes after the admin clicked Approve. The DB query is a
// single-row primary-key lookup — the latency hit is negligible compared
// to the broken UX of stale role checks.

export async function middleware(request) {
  const pathname = request.nextUrl.pathname

  // Short-circuit API and internal routes early — no auth work needed
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  const publicRoutes = ['/', '/listings', '/auth/callback', '/about', '/terms', '/privacy', '/refund', '/fraud-prevention']
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith('/listings/')
  )
  const protectedRoutes = ['/admin', '/seller', '/sell', '/buyer', '/profile', '/notifications']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Public routes: skip all auth work entirely (massive speed win — no DB hit, no Supabase getUser)
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Unknown routes (not public, not protected) — redirect home
  if (!isProtectedRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('error', 'unauthorized')
    redirectUrl.searchParams.set('message', 'System configuration error')
    return NextResponse.redirect(redirectUrl)
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      redirectUrl.searchParams.set('message', 'Please sign in to continue')
      return NextResponse.redirect(redirectUrl)
    }

    // Always fetch the live profile — no cookie cache. A primary-key lookup
    // on a single row is cheap, and the alternative (cached role) breaks the
    // moment an admin approves / suspends / removes a seller.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, seller_status')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      redirectUrl.searchParams.set('message', 'Profile not found')
      return NextResponse.redirect(redirectUrl)
    }

    if (pathname.startsWith('/admin') && profile.role !== 'admin') {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      redirectUrl.searchParams.set('message', 'Admin access required')
      return NextResponse.redirect(redirectUrl)
    }

    if (pathname.startsWith('/seller') && !['seller', 'admin'].includes(profile.role)) {
      if (pathname !== '/seller/apply') {
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.set('error', 'unauthorized')
        redirectUrl.searchParams.set('message', 'Seller access required')
        return NextResponse.redirect(redirectUrl)
      }
    }

    if (pathname === '/sell') {
      if (profile.role === 'admin') return supabaseResponse
      if (profile.seller_status !== 'approved') {
        return NextResponse.redirect(new URL('/seller/apply', request.url))
      }
    }
  } catch (err) {
    console.error('CRITICAL: Middleware error caught:', err)
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('error', 'unauthorized')
    redirectUrl.searchParams.set('message', 'Authentication service unavailable')
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
