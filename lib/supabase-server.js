import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Custom fetch wrapper with a 15-second timeout to prevent hanging requests on the server
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Supabase Server API request timed out after 15 seconds.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: fetchWithTimeout,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            )
          } catch {
            // This can be ignored if called from a Server Component
          }
        },
      },
    }
  )
}
