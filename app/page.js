'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCategoryEmoji, COMPANY_CONTACT } from '@/lib/helpers'
import SearchBar from '@/components/SearchBar'
import ListingGrid from '@/components/ListingGrid'
import toast from 'react-hot-toast'
import {
  ShieldCheck, Truck, Users, UserPlus,
  UploadCloud, MessageSquare, Star,
  Landmark, Award, Building2, TrendingUp, CreditCard, Shield,
  ChevronRight, Sparkles, ArrowRight,
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
      <section className="relative overflow-hidden bg-surface-50">
        {/* Background image with parallax-feel fade */}
        <div className="absolute inset-0">
          {heroImages.map((src, i) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-[1600ms] ease-in-out ${
                i === heroIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="100vw"
                quality={75}
                priority={i === 0}
                className="object-cover"
              />
            </div>
          ))}
          {/* Editorial overlay: dark at bottom, cream at top for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-surface-50/40 via-surface-50/10 to-surface-ink/55" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-50/85 via-surface-50/20 to-transparent" />
          {/* Grain */}
          <div className="absolute inset-0 bg-noise opacity-[0.18] mix-blend-overlay pointer-events-none" />
        </div>

        <div className="relative page-section pt-20 sm:pt-28 lg:pt-32 pb-24 sm:pb-32 lg:pb-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
              bg-white/90 backdrop-blur-sm border border-surface-200/80 text-[11px] font-semibold
              uppercase tracking-widest-plus text-primary-800 shadow-soft animate-reveal">
              <Sparkles className="w-3.5 h-3.5 text-secondary-500" />
              India&apos;s trusted livestock marketplace
            </div>

            <h1 className="mt-6 font-display text-display-2xl text-surface-ink animate-reveal [animation-delay:80ms]">
              Livestock trading,
              <br />
              <span className="italic text-primary-800">reimagined.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-surface-600 leading-relaxed animate-reveal [animation-delay:160ms]">
              Buy and sell cattle, goats, buffaloes and more &mdash; direct from verified farmers
              across 28 states. No middlemen. Transparent pricing. Real relationships.
            </p>

            <div className="mt-10 animate-reveal [animation-delay:240ms]">
              <SearchBar
                placeholder="Search Murrah buffalo, Gir cow, Boer goat…"
                className="max-w-2xl"
              />
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-surface-600">
                <span className="font-semibold text-surface-ink">Trending:</span>
                {['Cows', 'Goats', 'Buffaloes', 'Hens', 'Sheep'].map((t) => (
                  <Link
                    key={t}
                    href={`/listings?q=${encodeURIComponent(t.toLowerCase())}`}
                    className="underline-offset-4 hover:underline hover:text-primary-800 transition-colors"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Floating stat tile (desktop) */}
          <div className="hidden lg:block absolute right-8 xl:right-16 bottom-16 max-w-xs">
            <div className="relative p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-surface-200 shadow-float animate-reveal [animation-delay:320ms]">
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
        </div>

        {/* Decorative bottom hairline */}
        <div className="relative hairline" />
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

      {/* ---------------- CATEGORIES ---------------- */}
      <section className="page-section pt-16 sm:pt-20 pb-4">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="section-eyebrow">Categories</div>
            <h2 className="section-heading">Browse by species</h2>
          </div>
          <Link href="/listings" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary-800 hover:text-primary-900">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 w-32 skeleton rounded-2xl shrink-0" />
              ))
            : categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/listings?category=${cat.slug}`}
                  className="group relative flex flex-col items-center justify-center gap-2 px-6 py-5
                    bg-white border border-surface-200/70 rounded-2xl shadow-soft
                    hover:border-primary-300 hover:shadow-lift hover:-translate-y-0.5
                    min-w-[128px] shrink-0 transition-all duration-300"
                >
                  <span className="text-3xl transition-transform group-hover:scale-110">
                    {getCategoryEmoji(cat.slug)}
                  </span>
                  <span className="text-[13px] font-semibold text-surface-ink">
                    {cat.name}
                  </span>
                </Link>
              ))}
        </div>
      </section>

      {/* ---------------- FEATURED LISTINGS ---------------- */}
      <section className="page-section pt-16 sm:pt-20">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="section-eyebrow">Fresh from the farm</div>
            <h2 className="section-heading">Featured listings</h2>
          </div>
          <Link href="/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-800 hover:text-primary-900">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <ListingGrid
          listings={featuredListings}
          loading={loading}
          skeletonCount={8}
          wishlistedIds={wishlistedIds}
          currentUserId={user?.id}
          emptyTitle="No listings yet"
          emptyDescription="Be the first to list your animals on ekottam."
          emptyActionLabel="Start selling"
          emptyActionHref="/sell"
        />
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="py-20 sm:py-28 mt-16 bg-white border-y border-surface-200/70" id="how-it-works">
        <div className="page-section">
          <div className="max-w-3xl mb-14">
            <div className="section-eyebrow">The process</div>
            <h2 className="section-heading">A simple, honest way to trade.</h2>
            <p className="mt-4 text-surface-600 leading-relaxed">
              Four steps &mdash; from listing to delivery &mdash; designed around how farmers
              actually work. No paperwork mazes, no unnecessary commissions.
            </p>
          </div>

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {[
              { icon: UserPlus,    n: '01', title: 'Register & verify', desc: 'Create a free account and complete KYC to build trust with buyers.' },
              { icon: UploadCloud, n: '02', title: 'List your animal',  desc: 'Upload photos, breed details, health records, and your price.' },
              { icon: MessageSquare, n: '03', title: 'Connect & negotiate', desc: 'Buyers contact ekottam directly to discuss terms and pricing.' },
              { icon: Truck,       n: '04', title: 'Safe delivery',     desc: 'Payment is secured and transport logistics arranged seamlessly.' },
            ].map((step, i) => (
              <li key={i} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-display text-sm text-surface-400 tabular tracking-wider">{step.n}</span>
                  <span className="flex-1 h-px bg-surface-200" />
                </div>
                <step.icon className="w-8 h-8 text-primary-700 mb-4" strokeWidth={1.5} />
                <h3 className="font-display text-xl text-surface-ink mb-2">{step.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

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

      {/* ---------------- SCHEMES ---------------- */}
      <section className="py-20 sm:py-28 bg-surface-ink text-white relative overflow-hidden" id="schemes">
        <div className="absolute inset-0 bg-noise opacity-[0.08] pointer-events-none" />
        <div className="page-section relative">
          <div className="max-w-3xl mb-14">
            <div className="eyebrow text-secondary-300">Financial support</div>
            <h2 className="mt-3 font-display text-display-lg text-white text-balance">
              Government schemes,<br />
              <span className="italic text-secondary-300">matched to your farm.</span>
            </h2>
            <p className="mt-4 text-surface-300 leading-relaxed">
              Grow your operation with central and state subsidies. We&apos;ll help you
              navigate the paperwork.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Landmark,    title: 'National Livestock Mission', desc: 'Up to 50% capital subsidy (up to ₹50L) for poultry, sheep, goat, and piggery.' },
              { icon: Award,       title: 'Rashtriya Gokul Mission',    desc: '₹3,400 Cr scheme for conservation of indigenous bovine breeds.' },
              { icon: Building2,   title: 'NABARD DEDS',                desc: '25–33% back-ended capital subsidy for bankable dairy projects.' },
              { icon: TrendingUp,  title: 'AHIDF',                      desc: '₹15,000 Cr fund with 3% interest subvention for animal husbandry.' },
              { icon: CreditCard,  title: 'PM Kisan Credit Card',       desc: 'Working capital loans for livestock farmers at just 4% effective.' },
              { icon: Shield,      title: 'PM Livestock Insurance',     desc: '50–70% premium subsidy protection against animal death.' },
            ].map((scheme, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10
                  hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300"
              >
                <scheme.icon className="w-7 h-7 text-secondary-300 mb-4" strokeWidth={1.5} />
                <h3 className="font-display text-lg text-white mb-2">{scheme.title}</h3>
                <p className="text-[13px] text-surface-300 leading-relaxed">{scheme.desc}</p>
              </div>
            ))}
          </div>
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
            <div className="flex flex-col sm:flex-row gap-3 lg:justify-end">
              <Link
                href="/sell"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-surface-ink
                  rounded-full font-semibold hover:bg-secondary-100 transition-all shadow-lift"
              >
                Post ad for free <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={COMPANY_CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 border border-white/40
                  text-white rounded-full font-semibold hover:bg-white/10 transition-all"
              >
                Talk to sales
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
