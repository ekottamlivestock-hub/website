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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('CRITICAL: Supabase environment variables are missing!')
    }

    window.__supabaseClient = createBrowserClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          fetch: fetchWithTimeout,
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
  }
  client = window.__supabaseClient
} else {
  // Server-side fallback: client components are bundled for RSC/SSR/prerender,
  // and they import this module. During prerender the env vars may not be present
  // and createBrowserClient would throw, failing the build. Defer construction
  // until a method is actually called so prerender succeeds and the real client
  // is only built on the browser.
  const makeServerClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Supabase env vars missing — browser client cannot be used during SSR.')
    }
    return createBrowserClient(url, key, { global: { fetch: fetchWithTimeout } })
  }
  client = new Proxy({}, {
    get(_t, prop) {
      const real = makeServerClient()
      const v = real[prop]
      return typeof v === 'function' ? v.bind(real) : v
    },
  })
}

export const supabase = client
