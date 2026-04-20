import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  if (errorParam || errorDescription) {
    return NextResponse.redirect(`${origin}/?error=${errorParam || 'auth_failed'}&message=${encodeURIComponent(errorDescription || 'Authentication failed at provider')}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth_failed&message=No+auth+code+provided`)
  }

  // Build the final redirect response UP FRONT and let the Supabase SSR client
  // write auth cookies directly onto it via setAll. This avoids the prior bug
  // where cookies were queued to next/headers cookies() and occasionally
  // dropped before the redirect was emitted — causing login loops.
  let response = NextResponse.redirect(`${origin}${safeNext}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/?error=auth_failed&message=${encodeURIComponent(error.message)}`)
  }

  return response
}
