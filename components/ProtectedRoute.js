'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProtectedRoute({ children, requiredRole = 'any' }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const checkAuth = async (session) => {
      if (cancelled) return
      if (!session) {
        toast.error('Please sign in to continue')
        router.push('/')
        return
      }

      if (requiredRole === 'any') {
        if (!cancelled) {
          setAuthorized(true)
          setLoading(false)
        }
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, seller_status')
        .eq('id', session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (!profile) {
        toast.error('Profile not found')
        router.push('/')
        return
      }

      const roleCheck = {
        admin: profile.role === 'admin',
        seller: ['seller', 'admin'].includes(profile.role),
        buyer: true, // Any logged-in user can access buyer pages
      }

      if (roleCheck[requiredRole]) {
        setAuthorized(true)
      } else {
        toast.error("You don't have permission to access this page")
        router.push('/')
      }
      setLoading(false)
    }

    // Run the check once with whatever session exists right now,
    // THEN subscribe to changes. Relying on onAuthStateChange to fire
    // INITIAL_SESSION left users stuck on the loading spinner when the
    // event didn't arrive (BFCache, Strict-Mode race, lock contention).
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuth(session)
    }).catch(() => {
      if (!cancelled) checkAuth(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          checkAuth(session)
        }
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [requiredRole, router])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!authorized) return null

  return <>{children}</>
}
