'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Beef, Bird, Egg, Fish, Rabbit, PawPrint, Wheat, Milk, LayoutGrid,
} from 'lucide-react'

// Tiny lucide icon for a category — replaces the emoji cartoon set.
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

export default function CategoryBar() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category')

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('animal_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
      setCategories(data || [])
      setLoading(false)
    }
    fetchCategories()
  }, [])

  const handleClick = (slug) => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeCategory === slug) {
      params.delete('category')
    } else {
      params.set('category', slug)
    }
    params.delete('breed') // Reset breed on category change
    router.push(`/listings?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden py-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 w-24 skeleton rounded-full shrink-0" />
        ))}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-2.5 overflow-x-auto scrollbar-hide py-2 -mx-1 px-1"
    >
      {/* All */}
      <button
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('category')
          params.delete('breed')
          router.push(`/listings?${params.toString()}`)
        }}
        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold
          whitespace-nowrap shrink-0 transition-all duration-200 border ${
          !activeCategory
            ? 'bg-primary-700 text-white border-primary-700 shadow-glow'
            : 'bg-white text-surface-ink border-surface-200/80 hover:border-primary-400 hover:text-primary-700'
        }`}
      >
        <LayoutGrid className="w-4 h-4" strokeWidth={1.75} />
        All
      </button>

      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.slug)
        const isActive = activeCategory === cat.slug
        return (
          <button
            key={cat.id}
            onClick={() => handleClick(cat.slug)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold
              whitespace-nowrap shrink-0 transition-all duration-200 border ${
              isActive
                ? 'bg-primary-700 text-white border-primary-700 shadow-glow'
                : 'bg-white text-surface-ink border-surface-200/80 hover:border-primary-400 hover:text-primary-700'
            }`}
          >
            <Icon className="w-4 h-4" strokeWidth={1.75} />
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
