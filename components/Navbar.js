'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Menu, X, Search, Heart, Plus, ShieldCheck,
  User, LogOut, Package, LayoutDashboard, ChevronDown, Store, Clock,
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import LanguageSwitcher from './LanguageSwitcher'
import KottamLogo from './KottamLogo'

// Top-level nav has been intentionally pared back to a single CTA path:
// "Become a seller" → /seller/apply, with "Sign in" as the secondary action.
// Other pages remain reachable via the user dropdown / footer / search.

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const dropdownRef = useRef(null)
  const realtimeChannelRef = useRef(null)

  // Fetch profile for a given user id
  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      setProfile(data || null)
      return data
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      return null
    }
  }

  // Subscribe to realtime profile changes so role updates (e.g. admin approves seller)
  // are reflected immediately without the user having to log out and back in.
  const subscribeToProfile = (userId) => {
    // Clean up any existing subscription first
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          // Profile was updated (e.g. admin approved seller) — refresh locally
          setProfile(payload.new)
        }
      )
      .subscribe()

    realtimeChannelRef.current = channel
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          subscribeToProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          // Unsubscribe when logged out
          if (realtimeChannelRef.current) {
            supabase.removeChannel(realtimeChannelRef.current)
            realtimeChannelRef.current = null
          }
        }
      }
    )
    return () => {
      subscription.unsubscribe()
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setDropdownOpen(false)
  }, [pathname])

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/listings?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const isAdmin = profile?.role === 'admin'
  const isSeller = profile?.role === 'seller' || isAdmin
  const isPendingSeller = !isSeller && profile?.seller_status === 'pending'
  const canBecomeSeller = user && !isSeller && !isPendingSeller
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-surface-50/95 backdrop-blur-xl border-b border-surface-200 shadow-soft'
        : 'bg-surface-50/92 backdrop-blur-md border-b border-surface-200/60'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group"
          >
            <KottamLogo className="w-8 h-8 text-primary-700 group-hover:-translate-y-0.5 transition-transform" />
            <div className="flex flex-col justify-center">
              <span className="font-display text-[1.6rem] font-semibold text-surface-ink tracking-tight leading-none">
                ekottam
              </span>
              <span className="hidden sm:block text-[9px] font-semibold text-surface-400 uppercase tracking-widest-plus leading-tight mt-0.5">
                Livestock · since 2024
              </span>
            </div>
          </Link>

          {/* Desktop search (compact) — pushed to the right of the logo so the
              header stays an open lane to the seller CTA. */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md ml-6 mr-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                id="desktop-search"
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search livestock"
                className="w-full pl-10 pr-3 py-2.5 bg-white/70 border border-surface-200 rounded-full text-sm
                  placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50
                  focus:bg-white focus:border-primary-500/50 transition-all"
              />
            </div>
          </form>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />

            {!user ? (
              // NOT LOGGED IN — show only Sign In, never "Become a Seller"
              <button
                onClick={handleSignIn}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold
                  rounded-full text-surface-ink border border-surface-200/80 bg-white/80
                  hover:bg-white hover:border-primary-300 hover:text-primary-800 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in
              </button>
            ) : (
              <>
                {/* LOGGED IN + IS SELLER → show Sell button */}
                {isSeller && (
                  <Link href="/sell" className="btn-primary px-4 py-2.5 text-sm">
                    <Plus className="w-4 h-4" />
                    Sell
                  </Link>
                )}

                {/* LOGGED IN + NOT SELLER + NOT PENDING → show Become a Seller */}
                {canBecomeSeller && (
                  <Link
                    href="/seller/apply"
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold
                      bg-secondary-50 text-secondary-800 border border-secondary-200
                      hover:bg-secondary-100 rounded-full transition-all"
                  >
                    <Store className="w-4 h-4" />
                    Become a Seller
                  </Link>
                )}

                {/* LOGGED IN + PENDING → show status pill */}
                {isPendingSeller && (
                  <span className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                    bg-amber-50 text-amber-700 border border-amber-200 rounded-full cursor-default"
                    title="Your seller application is under review"
                  >
                    <Clock className="w-4 h-4" />
                    Application Pending
                  </span>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                      text-surface-500 hover:text-primary-700 hover:bg-primary-50 rounded-full transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                <Link
                  href="/buyer/wishlist"
                  className="p-2 text-surface-500 hover:text-accent-500 hover:bg-surface-100 rounded-full transition-all"
                  aria-label="Wishlist"
                >
                  <Heart className="w-5 h-5" />
                </Link>

                <NotificationBell userId={user.id} />

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 p-1 rounded-full hover:bg-surface-100 transition-all"
                    aria-label="Account menu"
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="rounded-full ring-1 ring-surface-200"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-700" />
                      </div>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-surface-400 transition-transform ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-float
                      border border-surface-200/70 py-2 animate-slide-down z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-surface-200/70">
                        <p className="text-sm font-semibold text-surface-ink truncate">
                          {profile?.full_name || user.email}
                        </p>
                        <p className="text-[11px] text-surface-400 capitalize tracking-wide mt-0.5">
                          {profile?.role || 'member'}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-600 hover:bg-surface-50 transition-colors">
                          <User className="w-4 h-4 text-surface-400" /> My Profile
                        </Link>

                        {isSeller && (
                          <Link href="/seller/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-600 hover:bg-surface-50 transition-colors">
                            <LayoutDashboard className="w-4 h-4 text-surface-400" /> Seller Dashboard
                          </Link>
                        )}

                        {isSeller && (
                          <Link href="/seller/listings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-600 hover:bg-surface-50 transition-colors">
                            <Package className="w-4 h-4 text-surface-400" /> My Listings
                          </Link>
                        )}

                        {/* Only show "Become a Seller" if logged in, not a seller, and not pending */}
                        {canBecomeSeller && (
                          <Link href="/seller/apply" className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-600 hover:bg-surface-50 transition-colors">
                            <Store className="w-4 h-4 text-surface-400" /> Become a Seller
                          </Link>
                        )}

                        {/* Show pending state in dropdown too */}
                        {isPendingSeller && (
                          <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600">
                            <Clock className="w-4 h-4 text-amber-400" /> Application Under Review
                          </div>
                        )}

                        <Link href="/buyer/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-600 hover:bg-surface-50 transition-colors">
                          <Package className="w-4 h-4 text-surface-400" /> My Orders
                        </Link>
                      </div>

                      <div className="border-t border-surface-200/70 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600
                            hover:bg-red-50 transition-colors w-full text-left"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-1">
            <LanguageSwitcher />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-surface-ink hover:bg-surface-100 rounded-full transition-all"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface-50 border-t border-surface-200/70 animate-slide-down">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                id="mobile-search"
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search animals, breeds, cities..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-surface-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>
          </form>

          <div className="px-4 pb-6 space-y-2">
            {!user ? (
              // NOT LOGGED IN — only Sign In
              <button
                onClick={handleSignIn}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3
                  text-sm font-semibold rounded-full text-surface-ink border border-surface-200/80
                  bg-white hover:bg-surface-100 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            ) : (
              <>
                {/* IS SELLER → show Create Listing */}
                {isSeller && (
                  <Link href="/sell" className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-primary-700 bg-primary-50 rounded-xl">
                    <Plus className="w-4 h-4" /> Create Listing
                  </Link>
                )}

                {/* NOT SELLER + NOT PENDING → show Become a Seller */}
                {canBecomeSeller && (
                  <Link href="/seller/apply" className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-secondary-800 bg-secondary-50 rounded-xl">
                    <Store className="w-4 h-4" /> Become a Seller
                  </Link>
                )}

                {/* PENDING → show status */}
                {isPendingSeller && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-amber-700 bg-amber-50 rounded-xl">
                    <Clock className="w-4 h-4" /> Application Under Review
                  </div>
                )}

                <Link href="/profile" className="block px-4 py-3 text-sm font-medium text-surface-ink hover:bg-white rounded-xl">
                  My Profile
                </Link>
                {isSeller && (
                  <Link href="/seller/dashboard" className="block px-4 py-3 text-sm font-medium text-surface-ink hover:bg-white rounded-xl">
                    Seller Dashboard
                  </Link>
                )}
                {isSeller && (
                  <Link href="/seller/listings" className="block px-4 py-3 text-sm font-medium text-surface-ink hover:bg-white rounded-xl">
                    My Listings
                  </Link>
                )}
                <Link href="/buyer/orders" className="block px-4 py-3 text-sm font-medium text-surface-ink hover:bg-white rounded-xl">
                  My Orders
                </Link>
                <Link href="/buyer/wishlist" className="block px-4 py-3 text-sm font-medium text-surface-ink hover:bg-white rounded-xl">
                  Wishlist
                </Link>
                <Link href="/notifications" className="block px-4 py-3 text-sm font-medium text-surface-ink hover:bg-white rounded-xl">
                  Notifications
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="block px-4 py-3 text-sm font-medium text-surface-ink hover:bg-white rounded-xl">
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
