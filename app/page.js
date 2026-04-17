'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCategoryEmoji } from '@/lib/helpers'
import SearchBar from '@/components/SearchBar'
import ListingGrid from '@/components/ListingGrid'
import toast from 'react-hot-toast'
import {
  Search, ShieldCheck, Truck, Users, UserPlus,
  UploadCloud, MessageSquare, ArrowRight, Star,
  Landmark, Award, Building2, TrendingUp, CreditCard, Shield,
  Quote, ChevronRight
} from 'lucide-react'

export default function HomePage() {
  return (
    <Suspense fallback={<div className="page-container flex justify-center py-20">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}

function HomePageContent() {
  const [categories, setCategories] = useState([])
  const [featuredListings, setFeaturedListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [wishlistedIds, setWishlistedIds] = useState([])
  const [heroIndex, setHeroIndex] = useState(0)
  const searchParams = useSearchParams()
  const hasFetchedRef = React.useRef(false)

  const heroImages = [
    '/images/1.jpg',
    '/images/2.jpg',
    '/images/3.jpg',
    '/images/4.jpg',
    '/images/5.jpg'
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [heroImages.length])

  useEffect(() => {
    // Show error toast if redirected with error param
    const error = searchParams.get('error')
    const message = searchParams.get('message')
    if (error) {
      toast.error(message || 'An error occurred. Please try again.')
      // Clean URL
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams])

  useEffect(() => {
    // Fetch categories and listings — these are public and don't depend on auth
    const fetchPublicData = async () => {
      try {
        // Fetch categories
        const { data: cats, error: catsError } = await supabase
          .from('animal_categories')
          .select('*')
          .eq('is_active', true)
          .order('name')
        if (catsError) console.error('Failed to fetch categories:', catsError)
        setCategories(cats || [])

        // Fetch featured listings
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select(`
            *,
            animal_categories (name, slug),
            profiles (full_name, avatar_url),
            listing_media (url, sort_order)
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8)
        if (listingsError) console.error('Failed to fetch listings:', listingsError)
        setFeaturedListings(listings || [])
      } catch (err) {
        console.error('Error fetching public data:', err)
        toast.error('Failed to load data. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    // Fetch wishlists — depends on authenticated session
    const fetchWishlist = async (session) => {
      try {
        if (session?.user) {
          const { data: wishlist } = await supabase
            .from('wishlists')
            .select('listing_id')
            .eq('user_id', session.user.id)
          setWishlistedIds(wishlist?.map(w => w.listing_id) || [])
        } else {
          setWishlistedIds([])
        }
      } catch (err) {
        console.error('Error fetching wishlist:', err)
      }
    }

    // Listen for auth state changes — this fires with INITIAL_SESSION on load
    // and SIGNED_IN after OAuth redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)

        // Only fetch public data (categories, listings) ONCE on first load.
        // Subsequent auth events (SIGNED_IN, TOKEN_REFRESHED) should NOT
        // re-trigger public data fetches or show loading skeletons — that
        // causes the "data disappears" flash during login.
        if (!hasFetchedRef.current) {
          hasFetchedRef.current = true
          fetchPublicData()
        }

        // Always re-fetch wishlist when auth state changes
        fetchWishlist(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-stone-900 py-20 sm:py-28 lg:py-32">
        {/* Image Carousel Background */}
        {heroImages.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              i === heroIndex ? 'opacity-40' : 'opacity-0'
            }`}
          >
            <Image
              src={src}
              alt="Livestock farming"
              fill
              className="object-cover object-center"
              priority={i <= 1}
            />
          </div>
        ))}

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-stone-900/80 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight">
              India&apos;s Trusted
              <br />
              <span className="text-secondary-300">Animal Marketplace</span>
            </h1>
            <p className="text-lg sm:text-xl text-green-100 mb-8 max-w-2xl mx-auto">
              Buy and sell livestock directly. No middlemen, verified sellers, 
              fair prices across all 28 states.
            </p>

            {/* Hero Search */}
            <div className="max-w-xl mx-auto mb-6">
              <SearchBar
                placeholder="Search for cows, goats, hens..."
                className="shadow-2xl shadow-black/20"
              />
            </div>

            <p className="text-sm text-green-200">
              Popular: <Link href="/listings?category=cow" className="underline hover:text-white">Cows</Link> • 
              <Link href="/listings?category=goat" className="underline hover:text-white ml-1">Goats</Link> • 
              <Link href="/listings?category=hen" className="underline hover:text-white ml-1">Hens</Link> • 
              <Link href="/listings?category=buffalo" className="underline hover:text-white ml-1">Buffaloes</Link>
            </p>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 50L60 45C120 40 240 30 360 33C480 36 600 52 720 58C840 64 960 60 1080 52C1200 44 1320 32 1380 26L1440 20V100H1380C1320 100 1200 100 1080 100C960 100 840 100 720 100C600 100 480 100 360 100C240 100 120 100 60 100H0V50Z" fill="#fafaf9"/>
          </svg>
        </div>
      </section>

      {/* Category Bar */}
      <section className="py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-stone-800 mb-4">Browse by Category</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 w-24 skeleton rounded-2xl shrink-0" />
              ))
            ) : (
              categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/listings?category=${cat.slug}`}
                  className="flex flex-col items-center gap-2 px-5 py-4 bg-white border border-stone-100 
                    rounded-2xl hover:border-primary-300 hover:shadow-md transition-all duration-200 
                    min-w-[90px] shrink-0 group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">
                    {getCategoryEmoji(cat.slug)}
                  </span>
                  <span className="text-xs font-semibold text-stone-600 group-hover:text-primary-600 transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-stone-800">Featured Listings</h2>
              <p className="text-sm text-stone-400 mt-1">Fresh listings from verified sellers</p>
            </div>
            <Link href="/listings" className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <ListingGrid
            listings={featuredListings}
            loading={loading}
            skeletonCount={8}
            wishlistedIds={wishlistedIds}
            currentUserId={user?.id}
            emptyTitle="No listings yet"
            emptyDescription="Be the first to list your animals on ekottam!"
            emptyActionLabel="Start Selling"
            emptyActionHref="/sell"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 bg-white" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Simple Process</span>
            <h2 className="text-3xl font-bold text-stone-800 mt-2">How ekottam Works</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: UserPlus, title: 'Register & Verify', desc: 'Create a free account and complete KYC to build trust.' },
              { icon: UploadCloud, title: 'List Your Animal', desc: 'Upload photos, breed details, health records, and your price.' },
              { icon: MessageSquare, title: 'Connect & Negotiate', desc: 'Buyers contact you directly to discuss terms and pricing.' },
              { icon: Truck, title: 'Safe Delivery', desc: 'Payment is secured and transport logistics arranged seamlessly.' },
            ].map((step, i) => (
              <div key={i} className="text-center group">
                <div className="relative mx-auto mb-4">
                  <div className="w-16 h-16 mx-auto bg-primary-50 rounded-2xl flex items-center justify-center 
                    group-hover:bg-primary-100 transition-colors">
                    <step.icon className="w-7 h-7 text-primary-600" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-primary-600 text-white text-xs font-bold 
                    rounded-full flex items-center justify-center shadow-md">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-stone-800 mb-1">{step.title}</h3>
                <p className="text-sm text-stone-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why ekottam */}
      <section className="py-16 sm:py-20" id="why">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-semibold text-primary-600 uppercase tracking-wider">The Impact</span>
              <h2 className="text-3xl font-bold text-stone-800 mt-2 mb-8">Why Choose ekottam?</h2>
              
              <div className="space-y-6">
                {[
                  { num: '01', title: 'Zero Middleman Commission', desc: 'Sell directly to end-buyers. You keep 100% of the negotiated price.' },
                  { num: '02', title: 'Health Verification Protocol', desc: 'Partnered with local vets to certify the health profile of premium animals.' },
                  { num: '03', title: 'Multilingual Support', desc: 'Platform available in Hindi, Telugu, Marathi, and 8+ regional languages.' },
                  { num: '04', title: 'Market Price Intelligence', desc: 'Real-time analytics tool helps you price your livestock competitively.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <span className="text-3xl font-extrabold text-stone-200 group-hover:text-primary-200 transition-colors">
                      {item.num}
                    </span>
                    <div>
                      <h4 className="font-semibold text-stone-800 mb-1">{item.title}</h4>
                      <p className="text-sm text-stone-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-600 to-emerald-700 rounded-3xl p-8 text-white">
              <h3 className="text-lg font-semibold mb-2">India&apos;s Livestock Potential</h3>
              <div className="text-5xl font-extrabold mb-2">₹6L Cr+</div>
              <p className="text-green-200 text-sm mb-6">Annual contribution to National GDP</p>
              
              <div className="space-y-4">
                {[
                  { label: 'Total Livestock Pop.', value: '500M+' },
                  { label: 'Rural Dependency', value: '70% HHs' },
                  { label: 'Global Ranking (Milk)', value: '#1' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-t border-white/20">
                    <span className="text-sm text-green-200">{stat.label}</span>
                    <span className="text-lg font-bold">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: ShieldCheck, title: 'Verified Sellers', desc: 'Every seller is KYC verified', color: 'text-primary-600 bg-primary-50' },
              { icon: Truck, title: 'Pan India Delivery', desc: 'Safe transport across 28 states', color: 'text-blue-600 bg-blue-50' },
              { icon: Users, title: '12,000+ Farmers', desc: 'Growing community of trust', color: 'text-secondary-600 bg-secondary-50' },
              { icon: Star, title: '4.8 Rating', desc: 'Loved by our community', color: 'text-purple-600 bg-purple-50' },
            ].map((badge, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl border border-stone-100 
                hover:shadow-md transition-all duration-200">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${badge.color}`}>
                  <badge.icon className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-stone-800 text-sm">{badge.title}</h4>
                <p className="text-xs text-stone-400 mt-1">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Government Schemes */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-stone-800 to-stone-900" id="schemes">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-primary-400 uppercase tracking-wider">Financial Support</span>
            <h2 className="text-3xl font-bold text-white mt-2">Government Schemes</h2>
            <p className="text-stone-400 mt-2">Grow your farm with central and state government subsidies</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Landmark, title: 'National Livestock Mission', desc: 'Up to 50% capital subsidy (up to ₹50L) for rural poultry, sheep, goat, and piggery development.' },
              { icon: Award, title: 'Rashtriya Gokul Mission', desc: '₹3,400 Crore scheme for conservation and development of indigenous bovine breeds.' },
              { icon: Building2, title: 'NABARD DEDS', desc: '25–33% back-ended capital subsidy for bankable dairy projects and entrepreneurship.' },
              { icon: TrendingUp, title: 'AHIDF', desc: '₹15,000 Crore fund offering 3% interest subvention for animal husbandry infrastructure.' },
              { icon: CreditCard, title: 'PM Kisan Credit Card', desc: 'Working capital loans for livestock farmers at effective rate of just 4%.' },
              { icon: Shield, title: 'PM Livestock Insurance', desc: 'Protection against animal death with 50–70% premium subsidy by the government.' },
            ].map((scheme, i) => (
              <div key={i} className="bg-stone-800/50 backdrop-blur border border-stone-700 rounded-2xl p-6 
                hover:border-primary-600/50 transition-all duration-200 group">
                <scheme.icon className="w-8 h-8 text-primary-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-white mb-2">{scheme.title}</h3>
                <p className="text-sm text-stone-400">{scheme.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20" id="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Success Stories</span>
            <h2 className="text-3xl font-bold text-stone-800 mt-2">What Our Farmers Say</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { text: "Before Ekottam, I had to travel 100km to the weekly mandi and still didn't get a fair price. I sold two Murrah buffaloes through the app at 20% higher profits directly to a dairy in Pune.", name: 'Rajesh Rao', location: 'Nizamabad, Telangana' },
              { text: "I applied for the NLM poultry subsidy after reading about it on Ekottam's scheme section. They even connected me with a consultant. Today, I have a 5,000-bird setup.", name: 'Santosh Patil', location: 'Kolhapur, Maharashtra' },
              { text: "Their buyer verification gave me peace of mind. Sold my Nellore sheep flock safely, and the payment was instant. The app is incredibly easy to use.", name: 'K. Venkata', location: 'Guntur, Andhra Pradesh' },
            ].map((t, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                <Quote className="w-8 h-8 text-primary-200 mb-3" />
                <p className="text-sm text-stone-600 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <h4 className="font-semibold text-stone-800 text-sm">{t.name}</h4>
                  <span className="text-xs text-stone-400">{t.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary-600 to-emerald-700" id="cta">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Modernize Your Livestock Business?
          </h2>
          <p className="text-lg text-green-100 mb-8">
            Join over 12,000 farmers who trust ekottam across India.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sell" className="px-8 py-4 bg-white text-primary-600 rounded-full font-bold text-base 
              hover:bg-green-50 transition-all shadow-lg hover:shadow-xl">
              Post Ad for Free
            </Link>
            <a href="https://wa.me/919391609598" target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 border-2 border-white text-white rounded-full font-bold text-base 
                hover:bg-white/10 transition-all">
              Contact Sales
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
