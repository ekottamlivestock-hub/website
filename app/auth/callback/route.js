import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  
  // If Supabase sends an error back directly in the callback URL parameters
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  if (errorParam || errorDescription) {
    return NextResponse.redirect(`${origin}/?error=${errorParam || 'auth_failed'}&message=${encodeURIComponent(errorDescription || 'Authentication failed at provider')}`)
  }

  if (code) {
    // Correctly instantiate the powerful SSR server client that correctly handles 
    // getAll and setAll cookie writing across @supabase/ssr
    const supabase = createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
      return NextResponse.redirect(`${origin}${safeNext}`)
    } else {
      // Pass the specific error message to the frontend
      return NextResponse.redirect(`${origin}/?error=auth_failed&message=${encodeURIComponent(error.message)}`)
    }
  }

  // Handle generic missing code error
  return NextResponse.redirect(`${origin}/?error=auth_failed&message=No+auth+code+provided`)
}
