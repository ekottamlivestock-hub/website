'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight } from 'lucide-react'

export default function SearchBar({
  placeholder = 'Search livestock, breeds, cities…',
  className = '',
}) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/listings?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative group ${className}`}
    >
      <div className="relative flex items-center bg-white rounded-full border border-surface-200/80
        shadow-lift transition-all duration-200 focus-within:border-primary-500/60
        focus-within:shadow-float focus-within:ring-2 focus-within:ring-primary-500/20">
        <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          type="text"
          id="search-query"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent pl-14 pr-2 py-5 text-base text-surface-ink
            placeholder:text-surface-400 focus:outline-none rounded-full"
        />
        <button
          type="submit"
          aria-label="Search"
          className="mr-2 inline-flex items-center gap-1.5 px-5 py-3 bg-surface-ink text-surface-50
            rounded-full text-sm font-semibold hover:bg-primary-800 transition-all"
        >
          <span className="hidden sm:inline">Search</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}
