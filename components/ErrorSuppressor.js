'use client'

import { useEffect } from 'react'

// Suppresses ONE specific Supabase auth-lock noise that fires when
// concurrent getSession() calls race in the gotrue client. We narrow
// the suppression to unhandledrejection only — the previous version
// also patched console.error globally, which silently broke any
// future error-monitoring tool that hooks console (Sentry, LogRocket).
//
// If the upstream Supabase fix lands, delete this component entirely.
const SUPABASE_LOCK_NOISE = 'was released because another request stole it'

export default function ErrorSuppressor() {
  useEffect(() => {
    const onUnhandledRejection = (event) => {
      try {
        const msg = String(event.reason)
        if (msg.includes(SUPABASE_LOCK_NOISE)) {
          event.preventDefault()
        }
      } catch {
        // never let suppression itself throw
      }
    }
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }, [])

  return null
}
