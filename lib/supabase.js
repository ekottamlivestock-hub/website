import { createBrowserClient } from '@supabase/ssr'

// Prevent multiple client instantiations during HMR and React Strict Mode
// which causes the "@supabase/gotrue-js orphaned lock" 5-second timeout error.
let client

// Custom fetch wrapper with a 15-second timeout to prevent hanging requests
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      cache: 'no-store', // Prevent Next.js from aggressively caching Supabase GET queries
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Supabase API request timed out after 15 seconds.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

if (typeof window !== 'undefined') {
  if (!window.__supabaseClient) {
    window.__supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          fetch: fetchWithTimeout,
        },
      }
    )
  }
  client = window.__supabaseClient
} else {
  // Fallback for SSR if accidentally imported
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: fetchWithTimeout,
      },
    }
  )
}

export const supabase = client
