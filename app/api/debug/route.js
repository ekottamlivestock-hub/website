import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {}
        },
      },
    }
  )

  const { data: user, error: authError } = await supabase.auth.getUser()

  const { data: listings, error: dbError } = await supabase
    .from('listings')
    .select(`*, animal_categories(name), profiles(full_name)`)
    .eq('status', 'approved')
    .limit(3)

  return NextResponse.json({
    user: user || null,
    authError: authError || null,
    listings: listings || null,
    dbError: dbError || null,
    allCookies: cookieStore.getAll()
  })
}
