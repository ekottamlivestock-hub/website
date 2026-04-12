import { createBrowserClient } from '@supabase/ssr'

// Prevent multiple client instantiations during HMR and React Strict Mode
// which causes the "@supabase/gotrue-js orphaned lock" 5-second timeout error.
let client

if (typeof window !== 'undefined') {
  if (!window.__supabaseClient) {
    window.__supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  client = window.__supabaseClient
} else {
  // Fallback for SSR if accidentally imported
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export const supabase = client
