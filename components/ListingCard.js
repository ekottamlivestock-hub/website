'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatAge } from '@/lib/helpers'
import toast from 'react-hot-toast'

export default function ListingCard({
  listing,
  showWishlist = true,
  isWishlisted = false,
  onWishlistChange,
  currentUserId,
}) {
  const [wishlisted, setWishlisted] = useState(isWishlisted)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  const thumbnail   = listing?.listing_media?.[0]?.url || listing?.media?.[0]?.url || '/images/1.jpg'
  const categoryName = listing?.animal_categories?.name || listing?.category_name || ''
  const sellerName   = listing?.profiles?.full_name || listing?.seller_name || 'Verified Seller'
  const isVerified   = listing?.profiles?.is_verified ?? true // default to verified since we gate listings

  const toggleWishlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUserId) {
      toast.error('Please sign in to save listings')
      return
    }

    setWishlistLoading(true)
    const newState = !wishlisted
    setWishlisted(newState)

    try {
      if (newState) {
        const { error } = await supabase
          .from('wishlists')
          .insert({ user_id: currentUserId, listing_id: listing.id })
        if (error) throw error
        toast.success('Saved')
      } else {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', currentUserId)
          .eq('listing_id', listing.id)
        if (error) throw error
        toast.success('Removed')
      }
      onWishlistChange?.(listing.id, newState)
    } catch {
      setWishlisted(!newState)
      toast.error('Failed to update wishlist')
    } finally {
      setWishlistLoading(false)
    }
  }

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 rounded-3xl"
    >
      <article className="relative overflow-hidden rounded-3xl bg-white border border-surface-200/70
        transition-all duration-500 ease-out group-hover:border-surface-300 group-hover:shadow-lift">
        {/* Image frame */}
        <div className="relative aspect-[5/4] overflow-hidden bg-surface-100">
          <Image
            src={thumbnail}
            alt={listing.title || 'Animal listing'}
            fill
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Top gradient so badges stay legible on bright photos */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24
            bg-gradient-to-b from-black/35 via-black/5 to-transparent" />

          {/* Category + status */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {categoryName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                bg-white/95 backdrop-blur-sm text-[11px] font-semibold text-surface-ink
                shadow-soft tracking-wide">
                {categoryName}
              </span>
            )}
            {listing.price_type === 'auction' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                bg-surface-ink/90 backdrop-blur-sm text-[11px] font-semibold text-white tracking-wide">
                Auction
              </span>
            )}
          </div>

          {/* Wishlist */}
          {showWishlist && (
            <button
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center
                rounded-full backdrop-blur-sm transition-all duration-200
                ${wishlisted
                  ? 'bg-accent-500 text-white shadow-lift'
                  : 'bg-white/85 text-surface-ink hover:bg-white shadow-soft hover:shadow-lift'}`}
            >
              <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Sold overlay */}
          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-surface-ink/70 flex items-center justify-center backdrop-blur-[2px]">
              <span className="font-display text-2xl italic text-white/95 tracking-wide">Sold</span>
            </div>
          )}

          {/* View arrow reveal */}
          <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white text-surface-ink
            flex items-center justify-center shadow-lift opacity-0 translate-y-2
            transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
            <ArrowUpRight className="w-4 h-4" strokeWidth={2.25} />
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title + price row */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-[1.2rem] leading-snug text-surface-ink text-balance
              line-clamp-2 pr-1 transition-colors group-hover:text-primary-700">
              {listing.title}
            </h3>
            <div className="shrink-0 text-right">
              <div className="font-display text-[1.15rem] text-primary-800 tabular tracking-tight">
                {formatPrice(listing.price)}
              </div>
              {listing.price_type === 'negotiable' && (
                <div className="text-[10px] font-semibold tracking-wider uppercase text-secondary-700 mt-0.5">
                  Negotiable
                </div>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-surface-500">
            {listing.age_value && listing.age_unit && (
              <span>{formatAge(listing.age_value, listing.age_unit)}</span>
            )}
            {listing.gender && listing.gender !== 'unknown' && (
              <>
                <span className="w-1 h-1 rounded-full bg-surface-300" />
                <span className="capitalize">{listing.gender}</span>
              </>
            )}
            {listing.weight_kg && (
              <>
                <span className="w-1 h-1 rounded-full bg-surface-300" />
                <span>{listing.weight_kg} kg</span>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-surface-200/70 flex items-center justify-between">
            {(listing.city || listing.state) ? (
              <div className="flex items-center gap-1.5 text-[12px] text-surface-500 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{[listing.city, listing.state].filter(Boolean).join(', ')}</span>
              </div>
            ) : (
              <span className="text-[12px] text-surface-500 truncate">{sellerName}</span>
            )}
            <div className="flex items-center gap-1 text-[11px] font-semibold text-primary-700 shrink-0">
              {isVerified && <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.25} />}
              <span className="tracking-wide uppercase">Verified</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

// Skeleton variant for loading states
export function ListingCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden border border-surface-200/70 bg-white">
      <div className="aspect-[5/4] skeleton rounded-none" />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="h-4 skeleton w-3/5" />
          <div className="h-4 skeleton w-16" />
        </div>
        <div className="flex gap-2">
          <div className="h-3 skeleton w-12" />
          <div className="h-3 skeleton w-14" />
        </div>
        <div className="h-px bg-surface-200/70" />
        <div className="flex items-center justify-between">
          <div className="h-3 skeleton w-28" />
          <div className="h-3 skeleton w-16" />
        </div>
      </div>
    </div>
  )
}
