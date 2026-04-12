'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export default function SearchBar({ placeholder = 'Search animals, breeds, locations...', className = '' }) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/listings?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
      <input
        type="text"
        id="search-query"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl text-base 
          placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 
          focus:border-transparent shadow-sm transition-all"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-primary-600 
          text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all"
      >
        Search
      </button>
    </form>
  )
}
