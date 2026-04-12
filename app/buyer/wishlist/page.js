'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ListingGrid from '@/components/ListingGrid'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Loader2 } from 'lucide-react'

export default function WishlistPage() {
  return (
    <ProtectedRoute requiredRole="any">
      <WishlistContent />
    </ProtectedRoute>
  )
}

function WishlistContent() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  const fetchWishlist = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)

    const { data } = await supabase
      .from('wishlists')
      .select(`
        listing_id,
        listings (
          *,
          animal_categories (name, slug),
          profiles (full_name, avatar_url),
          listing_media (url, sort_order)
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    setListings((data || []).map(w => w.listings).filter(Boolean))
    setLoading(false)
  }

  useEffect(() => { fetchWishlist() }, [])

  const handleWishlistChange = () => { fetchWishlist() }

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">My Wishlist</h1>
      <ListingGrid
        listings={listings}
        loading={loading}
        wishlistedIds={listings.map(l => l.id)}
        currentUserId={userId}
        onWishlistChange={handleWishlistChange}
        columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        emptyTitle="Your wishlist is empty"
        emptyDescription="Browse listings and save the ones you like!"
        emptyActionLabel="Browse Listings"
        emptyActionHref="/listings"
      />
    </div>
  )
}
