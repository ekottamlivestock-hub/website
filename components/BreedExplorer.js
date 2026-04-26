'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Beef, Bird, Egg, Fish, Rabbit, PawPrint, Wheat, Milk,
  ChevronRight, Sparkles,
} from 'lucide-react'

// Maps category slug → a clean lucide icon (no cartoon emojis).
// Falls back to PawPrint for any uncatalogued species.
function getCategoryIcon(slug = '') {
  const s = slug.toLowerCase()
  if (s.includes('cow') || s.includes('cattle') || s.includes('bovine')) return Beef
  if (s.includes('buffalo'))                                              return Milk
  if (s.includes('hen') || s.includes('chick') || s.includes('poultry'))  return Egg
  if (s.includes('duck'))                                                  return Bird
  if (s.includes('fish'))                                                  return Fish
  if (s.includes('rabbit'))                                                return Rabbit
  if (s.includes('goat') || s.includes('sheep') || s.includes('lamb'))    return Wheat
  return PawPrint
}

export default function BreedExplorer({ categories = [], loading = false }) {
  const [activeId, setActiveId] = useState(null)
  const [breeds, setBreeds] = useState([])
  const [breedLoading, setBreedLoading] = useState(false)

  // Pick the first category by default once they load.
  useEffect(() => {
    if (!activeId && categories.length > 0) {
      setActiveId(categories[0].id)
    }
  }, [categories, activeId])

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeId) || null,
    [categories, activeId],
  )

  // Fetch breeds whenever the active category changes.
  useEffect(() => {
    if (!activeId) return
    let cancelled = false
    setBreedLoading(true)
    setBreeds([])
    ;(async () => {
      const { data } = await supabase
        .from('animal_breeds')
        .select('id, name, category_id')
        .eq('category_id', activeId)
        .eq('is_active', true)
        .order('name')
      if (!cancelled) {
        setBreeds(data || [])
        setBreedLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [activeId])

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 w-32 skeleton rounded-full shrink-0" />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-24 skeleton rounded-full shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  if (categories.length === 0) return null

  return (
    <div className="space-y-7">
      {/* Category tabs — elegant pills with lucide icon, no cartoons. */}
      <div
        role="tablist"
        aria-label="Animal categories"
        className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.slug)
          const isActive = cat.id === activeId
          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(cat.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full
                text-[13px] font-semibold whitespace-nowrap border transition-all duration-200
                ${isActive
                  ? 'bg-primary-700 text-white border-primary-700 shadow-glow'
                  : 'bg-white text-surface-ink border-surface-200/80 hover:border-primary-400 hover:text-primary-700'}`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Breeds rail for the active category */}
      <div
        className="relative rounded-3xl bg-meadow border border-dairy-oat/60 p-5 sm:p-7
          shadow-soft overflow-hidden"
      >
        <div className="absolute inset-0 bg-noise opacity-[0.12] pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-700" strokeWidth={1.75} />
            <span className="eyebrow !text-primary-800">
              {activeCategory ? `Pick a ${activeCategory.name.toLowerCase()} breed` : 'Pick a breed'}
            </span>
          </div>
          {activeCategory && (
            <Link
              href={`/listings?category=${activeCategory.slug}`}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold
                text-primary-800 hover:text-primary-900 transition-colors"
            >
              See all {activeCategory.name.toLowerCase()} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {breedLoading ? (
          <div className="relative flex gap-2 overflow-x-auto scrollbar-hide">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 w-24 skeleton rounded-full shrink-0" />
            ))}
          </div>
        ) : breeds.length === 0 ? (
          <div className="relative">
            <p className="text-sm text-surface-600 mb-3">
              No specific breeds catalogued yet — browse all
              {activeCategory ? ` ${activeCategory.name.toLowerCase()}` : ''} listings instead.
            </p>
            {activeCategory && (
              <Link
                href={`/listings?category=${activeCategory.slug}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700
                  hover:text-primary-900"
              >
                Browse listings <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="relative flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {breeds.map((b, i) => (
              <Link
                key={b.id}
                href={`/listings?category=${activeCategory.slug}&breed=${b.id}`}
                className="shrink-0 inline-flex items-center px-4 py-2 rounded-full bg-white
                  border border-surface-200/80 text-[13px] font-semibold text-surface-ink
                  hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800
                  hover:-translate-y-0.5 hover:shadow-soft transition-all duration-200
                  animate-reveal"
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
              >
                {b.name}
              </Link>
            ))}

            {activeCategory && (
              <Link
                href={`/listings?category=${activeCategory.slug}`}
                className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-full
                  bg-primary-700 text-white text-[13px] font-semibold hover:bg-primary-800
                  shadow-soft hover:shadow-glow transition-all duration-200"
              >
                All breeds <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
