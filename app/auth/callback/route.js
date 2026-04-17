import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  
  // Create the final response object first so we can securely attach cookies directly to it.
  // Next.js Route Handlers occasionally drop cookies() queues if a new NextResponse is created later.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const response = NextResponse.redirect(`${origin}${safeNext}`)

  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  if (errorParam || errorDescription) {
    return NextResponse.redirect(`${origin}/?error=${errorParam || 'auth_failed'}&message=${encodeURIComponent(errorDescription || 'Authentication failed at provider')}`)
  }

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    } else {
      return NextResponse.redirect(`${origin}/?error=auth_failed&message=${encodeURIComponent(error.message)}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed&message=No+auth+code+provided`)
}
