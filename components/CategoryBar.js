'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCategoryEmoji } from '@/lib/helpers'

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
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium 
          whitespace-nowrap shrink-0 transition-all duration-200 border ${
          !activeCategory
            ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/20'
            : 'bg-white text-stone-600 border-stone-200 hover:border-primary-300 hover:text-primary-600'
        }`}
      >
        🐾 All
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleClick(cat.slug)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium 
            whitespace-nowrap shrink-0 transition-all duration-200 border ${
            activeCategory === cat.slug
              ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/20'
              : 'bg-white text-stone-600 border-stone-200 hover:border-primary-300 hover:text-primary-600'
          }`}
        >
          {getCategoryEmoji(cat.slug)} {cat.name}
        </button>
      ))}
    </div>
  )
}
