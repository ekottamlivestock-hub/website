'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ListingGrid from '@/components/ListingGrid'
import { INDIAN_STATES } from '@/lib/helpers'
import { SlidersHorizontal, X, Search, ArrowRight } from 'lucide-react'

// Sanitize user input before interpolating into PostgREST filter strings.
function sanitizeFilter(str) {
  if (!str) return ''
  return str.replace(/[,.()"'\\%]/g, '').trim()
}

function ListingsContent() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [breeds, setBreeds] = useState([])
  const [user, setUser] = useState(null)
  const [wishlistedIds, setWishlistedIds] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Read filters from URL
  const filters = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    breed: searchParams.get('breed') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    state: searchParams.get('state') || '',
    city: searchParams.get('city') || '',
    gender: searchParams.get('gender') || '',
    health: searchParams.get('health') || '',
    sort: searchParams.get('sort') || 'latest',
    page: parseInt(searchParams.get('page') || '1'),
  }

  const ITEMS_PER_PAGE = 12

  const updateFilter = useCallback((key, value) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    if (key !== 'page') params.set('page', '1')
    router.push(`/listings?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  const clearFilters = () => {
    router.push('/listings')
  }

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('animal_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
      setCategories(data || [])
    }
    fetchCategories()
  }, [])

  // Fetch breeds when category changes
  useEffect(() => {
    const fetchBreeds = async () => {
      if (!filters.category) {
        setBreeds([])
        return
      }
      const cat = categories.find(c => c.slug === filters.category)
      if (!cat) return
      const { data } = await supabase
        .from('animal_breeds')
        .select('*')
        .eq('category_id', cat.id)
        .eq('is_active', true)
        .order('name')
      setBreeds(data || [])
    }
    fetchBreeds()
  }, [filters.category, categories])

  // Track auth session via onAuthStateChange
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
        setSessionReady(true)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // Fetch listings
  useEffect(() => {
    if (!sessionReady) return

    const fetchListings = async () => {
      setLoading(true)

      try {
        let query = supabase
          .from('listings')
          .select(`
            *,
            animal_categories (name, slug),
            profiles (full_name, avatar_url),
            listing_media (url, sort_order)
          `, { count: 'estimated' })
          .eq('status', 'approved')

        if (filters.q) {
          const sq = sanitizeFilter(filters.q)
          if (sq) query = query.or(`title.ilike.%${sq}%,description.ilike.%${sq}%`)
        }

        if (filters.category) {
          const cat = categories.find(c => c.slug === filters.category)
          if (cat) query = query.eq('category_id', cat.id)
        }

        if (filters.breed) query = query.eq('breed_id', filters.breed)

        if (filters.minPrice) query = query.gte('price', parseInt(filters.minPrice))
        if (filters.maxPrice) query = query.lte('price', parseInt(filters.maxPrice))

        if (filters.state) {
          const ss = sanitizeFilter(filters.state)
          if (ss) query = query.ilike('state', `%${ss}%`)
        }
        if (filters.city) {
          const sc = sanitizeFilter(filters.city)
          if (sc) query = query.ilike('city', `%${sc}%`)
        }

        if (filters.gender) query = query.eq('gender', filters.gender)
        if (filters.health) query = query.eq('health_status', filters.health)

        switch (filters.sort) {
          case 'price_asc':
            query = query.order('price', { ascending: true })
            break
          case 'price_desc':
            query = query.order('price', { ascending: false })
            break
          default:
            query = query.order('created_at', { ascending: false })
        }

        const from = (filters.page - 1) * ITEMS_PER_PAGE
        query = query.range(from, from + ITEMS_PER_PAGE - 1)

        const { data, count, error } = await query
        if (error) console.error('Failed to fetch listings:', error)
        setListings(data || [])
        setTotalCount(count || 0)
      } catch (err) {
        console.error('Error fetching listings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchListings()
  }, [sessionReady, searchParams, categories, filters.breed, filters.category, filters.city, filters.gender, filters.health, filters.maxPrice, filters.minPrice, filters.page, filters.q, filters.sort, filters.state])

  // Wishlist
  useEffect(() => {
    if (!sessionReady) return
    if (!user) {
      setWishlistedIds([])
      return
    }
    let cancelled = false
    const fetchWishlist = async () => {
      const { data, error } = await supabase
        .from('wishlists')
        .select('listing_id')
        .eq('user_id', user.id)
      if (cancelled) return
      if (error) {
        console.error('Wishlist fetch error:', error)
        return
      }
      setWishlistedIds(data?.map(w => w.listing_id) || [])
    }
    fetchWishlist()
    return () => { cancelled = true }
  }, [sessionReady, user])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const hasActiveFilters = Object.entries(filters).some(([key, val]) =>
    key !== 'page' && key !== 'sort' && val
  )

  // Active filter chips for top of grid
  const activeChips = []
  if (filters.q) activeChips.push({ key: 'q', label: `"${filters.q}"` })
  if (filters.category) {
    const cat = categories.find(c => c.slug === filters.category)
    if (cat) activeChips.push({ key: 'category', label: cat.name })
  }
  if (filters.breed) {
    const br = breeds.find(b => b.id === filters.breed)
    if (br) activeChips.push({ key: 'breed', label: br.name })
  }
  if (filters.state) activeChips.push({ key: 'state', label: filters.state })
  if (filters.city) activeChips.push({ key: 'city', label: filters.city })
  if (filters.gender) activeChips.push({ key: 'gender', label: filters.gender })
  if (filters.health) activeChips.push({ key: 'health', label: filters.health })
  if (filters.minPrice) activeChips.push({ key: 'minPrice', label: `≥ ₹${filters.minPrice}` })
  if (filters.maxPrice) activeChips.push({ key: 'maxPrice', label: `≤ ₹${filters.maxPrice}` })

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="input-label">Search</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Animals, breeds, keywords"
            className="input-field pl-10 text-sm"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="input-label">Category</label>
        <select
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Breed */}
      {breeds.length > 0 && (
        <div>
          <label className="input-label">Breed</label>
          <select
            value={filters.breed}
            onChange={(e) => updateFilter('breed', e.target.value)}
            className="input-field text-sm"
          >
            <option value="">All breeds</option>
            {breeds.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Price Range */}
      <div>
        <label className="input-label">Price range (₹)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value)}
            placeholder="Min"
            className="input-field text-sm"
          />
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
            placeholder="Max"
            className="input-field text-sm"
          />
        </div>
      </div>

      {/* State */}
      <div>
        <label className="input-label">State</label>
        <select
          value={filters.state}
          onChange={(e) => updateFilter('state', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All states</option>
          {INDIAN_STATES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* City */}
      <div>
        <label className="input-label">City</label>
        <input
          type="text"
          value={filters.city}
          onChange={(e) => updateFilter('city', e.target.value)}
          placeholder="Any city"
          className="input-field text-sm"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="input-label">Gender</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: '', label: 'Any' },
            { val: 'male', label: 'Male' },
            { val: 'female', label: 'Female' },
          ].map(opt => (
            <button
              key={opt.val || 'any'}
              onClick={() => updateFilter('gender', opt.val)}
              className={`px-3 py-2 rounded-full text-xs font-semibold border transition-all ${
                filters.gender === opt.val
                  ? 'bg-surface-ink text-white border-surface-ink'
                  : 'bg-white text-surface-600 border-surface-200 hover:border-surface-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Health */}
      <div>
        <label className="input-label">Health status</label>
        <select
          value={filters.health}
          onChange={(e) => updateFilter('health', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">Any</option>
          <option value="healthy">Healthy</option>
          <option value="vaccinated">Vaccinated</option>
          <option value="certified">Certified</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full
            border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all"
        >
          <X className="w-4 h-4" /> Clear all filters
        </button>
      )}
    </div>
  )

  const activeCategorySlug = filters.category

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Editorial Header */}
      <header className="relative overflow-hidden bg-surface-100/60 border-b border-surface-200/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_0%,rgba(93,154,106,0.10),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="section-eyebrow">The marketplace</div>
              <h1 className="font-display text-display-lg text-surface-ink text-balance">
                Browse livestock{' '}
                <span className="italic text-primary-700">from verified farms.</span>
              </h1>
              <p className="mt-3 max-w-xl text-surface-500 text-[15px] leading-relaxed">
                Handpicked, health-verified animals from pan-India sellers.
                Every listing is vetted before it goes live.
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 shrink-0">
              <div>
                <p className="font-display text-2xl text-surface-ink tabular">
                  {loading ? '—' : totalCount.toLocaleString()}
                </p>
                <p className="text-[11px] uppercase tracking-widest-plus text-surface-500 mt-0.5">
                  Listings live
                </p>
              </div>
              <div className="w-px h-10 bg-surface-200" />
              <div>
                <p className="font-display text-2xl text-surface-ink tabular">100%</p>
                <p className="text-[11px] uppercase tracking-widest-plus text-surface-500 mt-0.5">
                  Verified sellers
                </p>
              </div>
            </div>
          </div>

          {/* Category scroller */}
          {categories.length > 0 && (
            <div className="mt-10 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 min-w-max pb-1">
                <button
                  onClick={() => updateFilter('category', '')}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    !activeCategorySlug
                      ? 'bg-surface-ink text-white border-surface-ink'
                      : 'bg-white text-surface-600 border-surface-200 hover:border-surface-400'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => updateFilter('category', cat.slug)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                      activeCategorySlug === cat.slug
                        ? 'bg-surface-ink text-white border-surface-ink'
                        : 'bg-white text-surface-600 border-surface-200 hover:border-surface-400'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        {/* Result bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <p className="text-sm text-surface-500">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
                Loading listings…
              </span>
            ) : (
              <>
                <span className="font-semibold text-surface-ink tabular">{totalCount}</span>
                {' '}listing{totalCount !== 1 ? 's' : ''} found
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-full">
              <span className="text-[11px] uppercase tracking-widest-plus text-surface-500">Sort</span>
              <select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="text-sm font-semibold text-surface-ink bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="latest">Latest</option>
                <option value="price_asc">Price: low → high</option>
                <option value="price_desc">Price: high → low</option>
              </select>
            </div>
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-surface-200
                rounded-full text-sm font-semibold text-surface-ink hover:border-surface-400 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {activeChips.map(chip => (
              <button
                key={chip.key}
                onClick={() => updateFilter(chip.key, '')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  bg-primary-50 text-primary-800 text-xs font-semibold border border-primary-100
                  hover:bg-primary-100 transition-all group"
              >
                <span className="capitalize">{chip.label}</span>
                <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-red-600 hover:text-red-700 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24">
              <div className="bg-white border border-surface-200/70 rounded-3xl p-6 shadow-soft">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg text-surface-ink flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary-700" />
                    Refine
                  </h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-[11px] uppercase tracking-widest-plus text-red-500 font-semibold hover:text-red-600"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <FilterPanel />
              </div>
            </div>
          </aside>

          {/* Listings */}
          <div className="flex-1 min-w-0">
            <ListingGrid
              listings={listings}
              loading={loading}
              skeletonCount={12}
              wishlistedIds={wishlistedIds}
              currentUserId={user?.id}
              columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              emptyTitle="No listings match your filters"
              emptyDescription="Try adjusting the price range, location, or clearing filters."
              emptyAction={
                hasActiveFilters ? (
                  <button onClick={clearFilters} className="btn-primary text-sm px-5 py-2.5">
                    Clear filters
                  </button>
                ) : undefined
              }
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-12 pt-8 border-t border-surface-200/70">
                <button
                  onClick={() => updateFilter('page', String(filters.page - 1))}
                  disabled={filters.page <= 1}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-white border border-surface-200
                    rounded-full hover:border-surface-ink hover:bg-surface-ink hover:text-white transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-surface-ink disabled:hover:border-surface-200"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-2 text-sm">
                  <span className="font-display text-xl text-surface-ink tabular">{filters.page}</span>
                  <span className="text-surface-400">/</span>
                  <span className="text-surface-500 tabular">{totalPages}</span>
                </div>

                <button
                  onClick={() => updateFilter('page', String(filters.page + 1))}
                  disabled={filters.page >= totalPages}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-white border border-surface-200
                    rounded-full hover:border-surface-ink hover:bg-surface-ink hover:text-white transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-surface-ink disabled:hover:border-surface-200"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Bottom Sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-surface-ink/50 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-surface-50 rounded-t-3xl max-h-[88vh]
            overflow-y-auto bottom-sheet-enter">
            <div className="sticky top-0 z-10 bg-surface-50/95 backdrop-blur-xl px-6 py-4 border-b border-surface-200/60 flex items-center justify-between">
              <div>
                <p className="eyebrow text-[10px]">Refine</p>
                <h3 className="font-display text-xl text-surface-ink">Filters</h3>
              </div>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-9 h-9 rounded-full bg-white border border-surface-200 flex items-center justify-center text-surface-500 hover:bg-surface-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <FilterPanel />
            </div>
            <div className="sticky bottom-0 bg-surface-50/95 backdrop-blur-xl px-6 py-4 border-t border-surface-200/60">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full btn-primary"
              >
                Show {totalCount} result{totalCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ListingsContent />
    </Suspense>
  )
}
