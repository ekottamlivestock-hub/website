'use client'

import { useRef } from 'react'
import ListingCard, { ListingCardSkeleton } from './ListingCard'
import { Package, ChevronLeft, ChevronRight } from 'lucide-react'
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
  // "rail" → horizontal scroll-snap row (book/film-strip feel)
  // "grid" → standard responsive grid (default for full listings page)
  variant = 'grid',
}) {
  const railRef = useRef(null)

  const scrollByAmount = (dir) => {
    const el = railRef.current
    if (!el) return
    // Move roughly one card-width plus gap.
    const step = Math.min(el.clientWidth * 0.85, 360)
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  // ---- Loading ----
  if (loading) {
    if (variant === 'rail') {
      return (
        <div className="h-rail">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="w-[78vw] max-w-[300px] sm:w-[44vw] sm:max-w-[280px] lg:w-[280px]"
            >
              <ListingCardSkeleton />
            </div>
          ))}
        </div>
      )
    }
    return (
      <div className={`grid ${columns} gap-5`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // ---- Empty ----
  if (!listings || listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-surface-300" />
        </div>
        <h3 className="text-lg font-semibold text-surface-700 mb-1">{emptyTitle}</h3>
        <p className="text-sm text-surface-500 mb-6 max-w-md">{emptyDescription}</p>
        {emptyAction ? (
          emptyAction
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={emptyActionHref} className="btn-primary text-sm px-5 py-2.5">
              {emptyActionLabel}
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-surface-100 text-surface-600 rounded-full text-sm font-semibold hover:bg-surface-200 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        )}
      </div>
    )
  }

  // ---- Rail (horizontal book-strip) ----
  if (variant === 'rail') {
    return (
      <div className="relative">
        {/* Floating prev/next controls (desktop). Touch users swipe. */}
        <div className="hidden md:flex absolute -top-14 right-0 items-center gap-2 z-10">
          <button
            type="button"
            aria-label="Scroll listings left"
            onClick={() => scrollByAmount(-1)}
            className="rail-nav"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            aria-label="Scroll listings right"
            onClick={() => scrollByAmount(1)}
            className="rail-nav"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </div>

        <div ref={railRef} className="h-rail h-rail-mask">
          {listings.map((listing, idx) => (
            <div
              key={listing.id}
              className="w-[78vw] max-w-[300px] sm:w-[44vw] sm:max-w-[280px] lg:w-[280px]
                animate-reveal"
              style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
            >
              <ListingCard
                listing={listing}
                isWishlisted={wishlistedIds.includes(listing.id)}
                currentUserId={currentUserId}
                onWishlistChange={onWishlistChange}
              />
            </div>
          ))}
        </div>

        {/* Subtle scroll hint for mobile users. */}
        <div className="md:hidden mt-1 flex items-center justify-center gap-1.5 text-[11px]
          uppercase tracking-widest text-surface-500">
          <ChevronLeft className="w-3 h-3" />
          <span>Swipe</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    )
  }

  // ---- Grid (default) ----
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
