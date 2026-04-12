'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Menu, X, Search, Heart, Plus, ShieldCheck,
  User, LogOut, Package, LayoutDashboard, ChevronDown, Store
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import LanguageSwitcher from './LanguageSwitcher'
import KottamLogo from './KottamLogo'

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

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(data)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(data)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
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
        redirectTo: `${window.location.origin}/auth/callback`,
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
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-lg shadow-sm' : 'bg-white'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <KottamLogo className="w-8 h-8 text-primary-600 group-hover:-translate-y-0.5 transition-transform" />
            <div className="flex flex-col justify-center">
              <span className="text-2xl font-black text-primary-600 tracking-tighter leading-none">
                EKOTTAM
              </span>
              <span className="hidden sm:block text-[9px] font-bold text-stone-400 uppercase tracking-[0.25em] leading-tight mt-0.5">
                livestock
              </span>
            </div>
          </Link>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                id="desktop-search"
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search animals, breeds, locations..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-100 border-0 rounded-full text-sm 
                  placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 
                  focus:bg-white transition-all"
              />
            </div>
          </form>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            
            {!user ? (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white 
                  rounded-full text-sm font-semibold hover:bg-primary-700 transition-all
                  shadow-md shadow-primary-600/20"
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
                {isSeller && (
                  <Link
                    href="/sell"
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white 
                      rounded-full text-sm font-semibold hover:bg-primary-700 transition-all
                      shadow-md shadow-primary-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    Sell
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium 
                      text-stone-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                <Link href="/buyer/wishlist" className="p-2 text-stone-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <Heart className="w-5 h-5" />
                </Link>

                <NotificationBell userId={user.id} />

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-stone-100 transition-all"
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="rounded-full ring-2 ring-stone-200"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-600" />
                      </div>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl 
                      border border-stone-100 py-2 animate-slide-down z-50">
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-sm font-semibold text-stone-800 truncate">
                          {profile?.full_name || user.email}
                        </p>
                        <p className="text-xs text-stone-400 capitalize">{profile?.role}</p>
                      </div>

                      <div className="py-1">
                        <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                          <User className="w-4 h-4" /> My Profile
                        </Link>

                        {isSeller && (
                          <Link href="/seller/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                            <LayoutDashboard className="w-4 h-4" /> Seller Dashboard
                          </Link>
                        )}

                        {!isSeller && profile?.seller_status !== 'approved' && (
                          <Link href="/seller/apply" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                            <Store className="w-4 h-4" /> Become a Seller
                          </Link>
                        )}

                        <Link href="/buyer/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                          <Package className="w-4 h-4" /> My Orders
                        </Link>
                      </div>

                      <div className="border-t border-stone-100 pt-1">
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

          {/* Mobile Toggle & Language */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-all"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-stone-100 animate-slide-down">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                id="mobile-search"
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search animals..."
                className="w-full pl-10 pr-4 py-3 bg-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </form>

          <div className="px-4 pb-4 space-y-1">
            <Link href="/listings" className="block px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl">
              Browse Listings
            </Link>

            {!user ? (
              <button
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 
                  text-white rounded-xl text-sm font-semibold"
              >
                Sign in with Google
              </button>
            ) : (
              <>
                {isSeller && (
                  <Link href="/sell" className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-xl">
                    <Plus className="w-4 h-4" /> Create Listing
                  </Link>
                )}
                <Link href="/profile" className="block px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl">
                  My Profile
                </Link>
                {isSeller && (
                  <Link href="/seller/dashboard" className="block px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl">
                    Seller Dashboard
                  </Link>
                )}
                <Link href="/buyer/orders" className="block px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl">
                  My Orders
                </Link>
                <Link href="/buyer/wishlist" className="block px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl">
                  Wishlist
                </Link>
                <Link href="/notifications" className="block px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl">
                  Notifications
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="block px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl">
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
