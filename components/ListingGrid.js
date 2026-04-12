'use client'

import ListingCard, { ListingCardSkeleton } from './ListingCard'
import { Package } from 'lucide-react'
import Link from 'next/link'

export default function ListingGrid({ 
  listings = [], 
  loading = false, 
  skeletonCount = 8, 
  wishlistedIds = [],
  currentUserId = null,
  onWishlistChange,
  emptyTitle = 'No listings found',
  emptyDescription = 'Try adjusting your filters or check back later.',
  emptyAction,
  emptyActionLabel = 'Browse All',
  emptyActionHref = '/listings',
  columns = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}) {
  if (loading) {
    return (
      <div className={`grid ${columns} gap-5`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-stone-300" />
        </div>
        <h3 className="text-lg font-semibold text-stone-700 mb-1">{emptyTitle}</h3>
        <p className="text-sm text-stone-400 mb-6 max-w-md">{emptyDescription}</p>
        {emptyAction ? (
          emptyAction
        ) : (
          <Link href={emptyActionHref} className="btn-primary text-sm px-5 py-2.5">
            {emptyActionLabel}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className={`grid ${columns} gap-5`}>
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isWishlisted={wishlistedIds.includes(listing.id)}
          currentUserId={currentUserId}
          onWishlistChange={onWishlistChange}
        />
      ))}
    </div>
  )
}
