'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CategoryBar from '@/components/CategoryBar'
import ListingGrid from '@/components/ListingGrid'
import { INDIAN_STATES } from '@/lib/helpers'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'

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

  // Fetch listings
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true)

      // Session
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)

      let query = supabase
        .from('listings')
        .select(`
          *,
          animal_categories (name, slug),
          profiles (full_name, avatar_url),
          listing_media (url, sort_order)
        `, { count: 'exact' })
        .eq('status', 'approved')

      // Search
      if (filters.q) {
        query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`)
      }

      // Category
      if (filters.category) {
        const cat = categories.find(c => c.slug === filters.category)
        if (cat) query = query.eq('category_id', cat.id)
      }

      // Breed
      if (filters.breed) {
        query = query.eq('breed_id', filters.breed)
      }

      // Price range
      if (filters.minPrice) query = query.gte('price', parseInt(filters.minPrice))
      if (filters.maxPrice) query = query.lte('price', parseInt(filters.maxPrice))

      // Location
      if (filters.state) query = query.ilike('state', `%${filters.state}%`)
      if (filters.city) query = query.ilike('city', `%${filters.city}%`)

      // Gender
      if (filters.gender) query = query.eq('gender', filters.gender)

      // Health
      if (filters.health) query = query.eq('health_status', filters.health)

      // Sort
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

      // Pagination
      const from = (filters.page - 1) * ITEMS_PER_PAGE
      query = query.range(from, from + ITEMS_PER_PAGE - 1)

      const { data, count } = await query
      setListings(data || [])
      setTotalCount(count || 0)

      // Wishlists
      if (session?.user) {
        const { data: wishlist } = await supabase
          .from('wishlists')
          .select('listing_id')
          .eq('user_id', session.user.id)
        setWishlistedIds(wishlist?.map(w => w.listing_id) || [])
      }

      setLoading(false)
    }
    fetchListings()
  }, [searchParams, categories, filters.breed, filters.category, filters.city, filters.gender, filters.health, filters.maxPrice, filters.minPrice, filters.page, filters.q, filters.sort, filters.state])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const hasActiveFilters = Object.entries(filters).some(([key, val]) => 
    key !== 'page' && key !== 'sort' && val
  )

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="input-label">Search</label>
        <input
          type="text"
          value={filters.q}
          onChange={(e) => updateFilter('q', e.target.value)}
          placeholder="Search animals..."
          className="input-field text-sm"
        />
      </div>

      {/* Category */}
      <div>
        <label className="input-label">Category</label>
        <select
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All Categories</option>
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
            <option value="">All Breeds</option>
            {breeds.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Price Range */}
      <div>
        <label className="input-label">Price Range (₹)</label>
        <div className="flex gap-2">
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
          <option value="">All States</option>
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
          placeholder="Enter city..."
          className="input-field text-sm"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="input-label">Gender</label>
        <select
          value={filters.gender}
          onChange={(e) => updateFilter('gender', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">Any</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      {/* Health Status */}
      <div>
        <label className="input-label">Health Status</label>
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

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button onClick={clearFilters} className="w-full btn-ghost text-sm text-red-500 hover:bg-red-50">
          Clear All Filters
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-stone-800 mb-4">Browse Listings</h1>
          <Suspense fallback={<div className="h-12 skeleton rounded-full" />}>
            <CategoryBar />
          </Suspense>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Sort & Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-stone-500">
            {loading ? 'Loading...' : `${totalCount} listing${totalCount !== 1 ? 's' : ''} found`}
          </p>
          <div className="flex items-center gap-3">
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="latest">Latest First</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 
                rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </h3>
              <FilterPanel />
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
              emptyDescription="Try adjusting your filters to find what you're looking for."
              emptyAction={
                hasActiveFilters ? (
                  <button onClick={clearFilters} className="btn-primary text-sm px-5 py-2.5">
                    Clear Filters
                  </button>
                ) : undefined
              }
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => updateFilter('page', String(filters.page - 1))}
                  disabled={filters.page <= 1}
                  className="px-4 py-2 text-sm font-medium bg-white border border-stone-200 rounded-xl 
                    hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-stone-600">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  onClick={() => updateFilter('page', String(filters.page + 1))}
                  disabled={filters.page >= totalPages}
                  className="px-4 py-2 text-sm font-medium bg-white border border-stone-200 rounded-xl 
                    hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Bottom Sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] 
            overflow-y-auto bottom-sheet-enter">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">Filters</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <FilterPanel />
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-stone-100">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full btn-primary"
              >
                Show {totalCount} Results
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
