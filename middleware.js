import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PROFILE_COOKIE = 'ek_profile'
const PROFILE_TTL_SECONDS = 10 * 60 // 10 min

function readProfileCookie(request) {
  const raw = request.cookies.get(PROFILE_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(raw))
    if (!parsed?.uid || !parsed?.exp) return null
    if (Date.now() / 1000 > parsed.exp) return null
    return parsed
  } catch {
    return null
  }
}

function writeProfileCookie(response, uid, role, sellerStatus) {
  const payload = {
    uid,
    role: role || 'buyer',
    seller_status: sellerStatus || null,
    exp: Math.floor(Date.now() / 1000) + PROFILE_TTL_SECONDS,
  }
  response.cookies.set(PROFILE_COOKIE, encodeURIComponent(JSON.stringify(payload)), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PROFILE_TTL_SECONDS,
  })
}

function clearProfileCookie(response) {
  response.cookies.set(PROFILE_COOKIE, '', { path: '/', maxAge: 0 })
}

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
      const redirect = NextResponse.redirect(redirectUrl)
      clearProfileCookie(redirect)
      return redirect
    }

    // Try profile cookie first — avoids DB hit on every protected-route request
    let profile = readProfileCookie(request)
    if (!profile || profile.uid !== user.id) {
      const { data: dbProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role, seller_status')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError || !dbProfile) {
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.set('error', 'unauthorized')
        redirectUrl.searchParams.set('message', 'Profile not found')
        return NextResponse.redirect(redirectUrl)
      }

      profile = {
        uid: user.id,
        role: dbProfile.role,
        seller_status: dbProfile.seller_status,
      }
      writeProfileCookie(supabaseResponse, user.id, dbProfile.role, dbProfile.seller_status)
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
