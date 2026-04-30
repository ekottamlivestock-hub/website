'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { COMPANY_CONTACT } from '@/lib/helpers'
import SearchBar from '@/components/SearchBar'
import ListingGrid from '@/components/ListingGrid'
import BreedExplorer from '@/components/BreedExplorer'
import NewsRail from '@/components/NewsRail'
import HomeAds from '@/components/HomeAds'
import toast from 'react-hot-toast'
import {
  ShieldCheck, Truck, Users, Star,
  ChevronRight, Sparkles, ArrowRight, Store,
} from 'lucide-react'

export default function HomePage() {
  return (
    <Suspense fallback={<div className="page-container flex justify-center py-20">Loading…</div>}>
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
  const loadAttemptRef = React.useRef(0)

  const heroImages = ['/images/1.jpg', '/images/2.jpg', '/images/3.jpg', '/images/4.jpg', '/images/5.jpg']

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [heroImages.length])

  useEffect(() => {
    const error = searchParams.get('error')
    const message = searchParams.get('message')
    if (error) {
      toast.error(message || 'An error occurred. Please try again.')
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams])

  const loadData = React.useCallback(async (currentUser = null) => {
    setLoading(true)
    loadAttemptRef.current += 1
    try {
      const { data: cats } = await supabase
        .from('animal_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
      setCategories(cats || [])

      const { data: listings } = await supabase
        .from('listings')
        .select(`*, animal_categories (name, slug), profiles (full_name, avatar_url), listing_media (url, sort_order)`)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(8)
      setFeaturedListings(listings || [])

      if (currentUser) {
        const { data: wishlist } = await supabase
          .from('wishlists')
          .select('listing_id')
          .eq('user_id', currentUser.id)
        setWishlistedIds(wishlist?.map(w => w.listing_id) || [])
      } else {
        setWishlistedIds([])
      }
    } catch (err) {
      console.error('[HomePage] Unexpected error during load:', err)
      toast.error('Failed to connect to the database. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return
        const currentUser = session?.user || null
        setUser(currentUser)
        loadData(currentUser)
      })
      .catch((err) => {
        if (!mounted) return
        console.warn('[HomePage] getSession failed, loading public data:', err)
        loadData(null)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          const currentUser = session?.user || null
          setUser(currentUser)
          loadData(currentUser)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadData])

  return (
    <div className="min-h-screen">
      {/* ---------------- HERO ---------------- */}
      {/* Fills the visible viewport beneath the fixed 4rem navbar so the
          stats marquee never peeks above the fold on phones. dvh tracks the
          live mobile viewport (browser chrome show/hide) better than vh. */}
      <section className="relative overflow-hidden bg-primary-900
        min-h-[calc(100dvh-4rem)] flex items-stretch">
        {/* Background images with parallax-feel fade + Ken Burns zoom on the
            active slide. object-position keeps the animal centred on portrait
            phone screens where edges otherwise crop. */}
        <div className="absolute inset-0">
          {heroImages.map((src, i) => {
            const isActive = i === heroIndex
            return (
              <div
                key={src}
                className={`absolute inset-0 transition-opacity duration-[1600ms] ease-in-out ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div
                  // re-key the inner wrapper so the Ken Burns animation restarts
                  // every time this slide becomes active.
                  key={`kb-${heroIndex}-${i}`}
                  className={`absolute inset-0 ${isActive ? 'animate-ken-burns' : ''}`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="100vw"
                    quality={80}
                    priority={i === 0}
                    className="object-cover object-[center_30%] sm:object-center"
                  />
                </div>
              </div>
            )
          })}
          {/* Editorial dark overlays for white-text readability */}
          {/* 1. Strong left scrim where headline lives */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-900/60 to-primary-900/25" />
          {/* 2. Top-to-bottom vignette that anchors the navbar edge */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary-900/65 via-transparent to-primary-900/75" />
          {/* 3. Fine grain */}
          <div className="absolute inset-0 bg-noise opacity-[0.22] mix-blend-overlay pointer-events-none" />
        </div>

        <div className="relative page-section pt-28 sm:pt-32 lg:pt-40 pb-24 sm:pb-32 lg:pb-40 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
              bg-white/10 backdrop-blur-xl border border-white/25 text-[11px] font-semibold
              uppercase tracking-widest-plus text-secondary-200 shadow-soft animate-reveal">
              <Sparkles className="w-3.5 h-3.5 text-secondary-300" />
              India&apos;s trusted livestock marketplace
            </div>

            <h1 className="mt-6 font-display text-display-2xl text-white animate-reveal [animation-delay:80ms] drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
              Livestock trading,
              <br />
              <span className="italic text-secondary-300">reimagined.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-white/85 leading-relaxed animate-reveal [animation-delay:160ms]">
              Buy and sell cattle, goats, buffaloes and more &mdash; direct from verified farmers
              across 28 states. No middlemen. Transparent pricing. Real relationships.
            </p>

            <div className="mt-10 animate-reveal [animation-delay:240ms]">
              <SearchBar
                placeholder="Search Murrah buffalo, Gir cow, Boer goat…"
                className="max-w-2xl"
              />
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
                <span className="font-semibold text-white">Trending:</span>
                {['Cows', 'Goats', 'Buffaloes', 'Hens', 'Sheep'].map((t) => (
                  <Link
                    key={t}
                    href={`/listings?q=${encodeURIComponent(t.toLowerCase())}`}
                    className="underline-offset-4 hover:underline hover:text-secondary-200 transition-colors"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Floating stat tile (desktop) */}
          <div className="hidden lg:block absolute right-8 xl:right-16 bottom-16 max-w-xs">
            <div className="relative p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-float animate-reveal [animation-delay:320ms]">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-10 h-10 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-display text-2xl text-surface-ink leading-tight tabular">12,400+</div>
                  <div className="text-xs text-surface-500 mt-1">Farmers already trading on ekottam</div>
                </div>
              </div>
              <div className="mt-5 pt-5 border-t border-surface-200/70 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full ring-2 ring-white bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-800"
                    >
                      {String.fromCharCode(64 + i * 3)}
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-surface-500">
                  <span className="text-surface-ink font-semibold">28 states</span> · live listings across India
                </div>
              </div>
            </div>
          </div>

          {/* Hero slide indicator dots */}
          <div className="hidden sm:flex absolute bottom-8 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:bottom-8 lg:right-8 xl:right-16 items-center gap-1.5">
            {heroImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1 rounded-full transition-all ${
                  i === heroIndex ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- STATS MARQUEE ---------------- */}
      <section className="border-b border-surface-200/60 bg-surface-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: '₹6L Cr+', l: 'Annual livestock GDP' },
            { n: '500M+', l: 'Heads of livestock' },
            { n: '#1', l: 'Global milk producer' },
            { n: '70%', l: 'Rural households engaged' },
          ].map((s, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="font-display text-2xl sm:text-3xl text-surface-ink tabular tracking-tight">{s.n}</div>
              <div className="text-[11px] uppercase tracking-widest text-surface-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CHOOSE A BREED ---------------- */}
      <section className="page-section pt-16 sm:pt-20 pb-4">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="section-eyebrow">Find your match</div>
            <h2 className="section-heading">
              Choose a <span className="italic text-primary-700">breed</span>.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-surface-600 leading-relaxed">
              Pick a species, then jump straight to the breed you&apos;re looking for &mdash;
              Murrah, Gir, Sahiwal, Boer, Jamunapari and more.
            </p>
          </div>
          <Link href="/listings" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary-800 hover:text-primary-900">
            Browse all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <BreedExplorer categories={categories} loading={loading} />
      </section>

      {/* ---------------- FEATURED LISTINGS (HORIZONTAL RAIL) ---------------- */}
      <section className="page-section pt-16 sm:pt-20 relative">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="section-eyebrow">Fresh from the farm</div>
            <h2 className="section-heading">
              Featured <span className="italic text-primary-700">listings</span>.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-surface-600 leading-relaxed">
              Scroll the rail &mdash; new animals come in daily from verified farmers across India.
            </p>
          </div>
          <Link href="/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-800 hover:text-primary-900">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <ListingGrid
          variant="rail"
          listings={featuredListings}
          loading={loading}
          skeletonCount={6}
          wishlistedIds={wishlistedIds}
          currentUserId={user?.id}
          emptyTitle="No listings yet"
          emptyDescription="Be the first to list your animals on ekottam."
          emptyActionLabel="Start selling"
          emptyActionHref="/sell"
        />
      </section>

      {/* ---------------- WE IN NEWS (admin-managed) ---------------- */}
      <NewsRail />

      {/* ---------------- HOME ADS (admin-managed) ---------------- */}
      <HomeAds />

      {/* ---------------- WHY ---------------- */}
      <section className="py-20 sm:py-28" id="why">
        <div className="page-section">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            <div className="lg:col-span-3">
              <div className="section-eyebrow">Why ekottam</div>
              <h2 className="section-heading">Built for the way India farms.</h2>

              <div className="mt-10 space-y-8">
                {[
                  { title: 'Zero middleman commission', desc: 'Sell directly to end-buyers. You keep 100% of the negotiated price.' },
                  { title: 'Health verification protocol', desc: 'Partnered with local vets to certify the health profile of premium animals.' },
                  { title: 'Multilingual by design', desc: 'Platform available in Hindi, Telugu, Marathi, and 8+ regional languages.' },
                  { title: 'Market price intelligence', desc: 'Real-time analytics tool helps you price your livestock competitively.' },
                ].map((item, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr] gap-6 pt-6 border-t border-surface-200/70 first:border-t-0 first:pt-0">
                    <span className="font-display text-sm text-primary-700 tabular">
                      0{i + 1}.
                    </span>
                    <div>
                      <h4 className="font-display text-xl text-surface-ink mb-1.5">{item.title}</h4>
                      <p className="text-sm text-surface-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 lg:sticky lg:top-28">
              <div className="relative overflow-hidden rounded-3xl bg-primary-900 text-white p-8 shadow-float">
                <div className="absolute inset-0 bg-noise opacity-[0.15] pointer-events-none" />
                <div className="relative">
                  <div className="eyebrow text-secondary-300">Market potential</div>
                  <div className="mt-3 font-display text-5xl sm:text-6xl tabular tracking-tight">₹6L Cr+</div>
                  <p className="mt-2 text-sm text-primary-100/70">Annual contribution to India&apos;s GDP</p>

                  <dl className="mt-8 space-y-4">
                    {[
                      { label: 'Livestock population', value: '500M+' },
                      { label: 'Rural dependency',     value: '70% of HHs' },
                      { label: 'Global ranking (milk)', value: '#1' },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-t border-white/15">
                        <dt className="text-xs uppercase tracking-widest text-primary-200/70">{stat.label}</dt>
                        <dd className="font-display tabular text-lg">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- TRUST BADGES ---------------- */}
      <section className="page-section pb-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, title: 'Verified sellers', desc: 'Every seller is KYC verified' },
            { icon: Truck,       title: 'Pan-India delivery', desc: 'Safe transport across 28 states' },
            { icon: Users,       title: '12,000+ farmers', desc: 'Growing community of trust' },
            { icon: Star,        title: '4.8 rating',      desc: 'Loved by our community' },
          ].map((badge, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white border border-surface-200/70 hover:border-primary-300 transition-colors">
              <badge.icon className="w-6 h-6 text-primary-700 mb-3" strokeWidth={1.5} />
              <h4 className="font-semibold text-surface-ink text-[15px]">{badge.title}</h4>
              <p className="text-xs text-surface-500 mt-1">{badge.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- TESTIMONIALS ---------------- */}
      <section className="py-20 sm:py-28 page-section" id="testimonials">
        <div className="max-w-3xl mb-14">
          <div className="section-eyebrow">Stories from the field</div>
          <h2 className="section-heading">Farmers who switched to ekottam.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { text: 'Before ekottam, I travelled 100km to the mandi and still didn\'t get fair prices. I sold two Murrah buffaloes through the app at 20% higher profits directly to a dairy in Pune.', name: 'Rajesh Rao', location: 'Nizamabad, Telangana' },
            { text: 'I applied for the NLM poultry subsidy after reading about it on ekottam\'s scheme section. They connected me with a consultant. Today, I have a 5,000-bird setup.', name: 'Santosh Patil', location: 'Kolhapur, Maharashtra' },
            { text: 'Their buyer verification gave me peace of mind. Sold my Nellore sheep flock safely, and the payment was instant. The app is incredibly easy to use.', name: 'K. Venkata', location: 'Guntur, Andhra Pradesh' },
          ].map((t, i) => (
            <figure key={i} className="relative p-8 rounded-3xl bg-white border border-surface-200/70 hover:shadow-lift transition-all duration-300">
              <div className="absolute -top-3 left-8 font-display text-6xl text-primary-200 leading-none select-none">&ldquo;</div>
              <blockquote className="relative pt-2 font-display text-[1.05rem] leading-relaxed text-surface-ink text-pretty">
                {t.text}
              </blockquote>
              <figcaption className="mt-6 pt-6 border-t border-surface-200/70">
                <div className="font-semibold text-surface-ink text-sm">{t.name}</div>
                <div className="text-[11px] text-surface-500 uppercase tracking-widest mt-0.5">{t.location}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="page-section pb-20" id="cta">
        <div className="relative overflow-hidden rounded-[32px] bg-primary-800 text-white p-10 sm:p-16">
          <div className="absolute inset-0 bg-noise opacity-[0.12] pointer-events-none" />
          <div className="absolute -right-32 -top-32 w-[28rem] h-[28rem] rounded-full bg-secondary-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-[22rem] h-[22rem] rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-end">
            <div>
              <div className="eyebrow text-secondary-300">Ready to trade?</div>
              <h2 className="mt-3 font-display text-display-xl text-white text-balance">
                Join 12,400+ farmers<br />
                <span className="italic text-secondary-300">already selling on ekottam.</span>
              </h2>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              {/* If logged in go to /sell; if not, prompt Google sign-in first */}
              {user ? (
                <Link
                  href="/sell"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white
                    text-surface-ink rounded-full font-semibold transition-all shadow-lift
                    hover:bg-secondary-100 hover:-translate-y-0.5"
                >
                  Post ad for free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <button
                  onClick={async () => {
                    await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/auth/callback?next=/sell`,
                        queryParams: { prompt: 'select_account' },
                      },
                    })
                  }}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white
                    text-surface-ink rounded-full font-semibold transition-all shadow-lift
                    hover:bg-secondary-100 hover:-translate-y-0.5"
                >
                  Post ad for free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              )}
              <a
                href={COMPANY_CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-secondary-200 hover:text-white transition-colors"
              >
                or talk to us on WhatsApp →
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
