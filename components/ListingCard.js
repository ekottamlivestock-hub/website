'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatAge, getCategoryEmoji } from '@/lib/helpers'
import toast from 'react-hot-toast'

export default function ListingCard({ listing, showWishlist = true, isWishlisted = false, onWishlistChange, currentUserId }) {
  const [wishlisted, setWishlisted] = useState(isWishlisted)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  const thumbnail = listing?.listing_media?.[0]?.url || listing?.media?.[0]?.url || '/images/1.jpg'
  const categoryName = listing?.animal_categories?.name || listing?.category_name || ''
  const categorySlug = listing?.animal_categories?.slug || listing?.category_slug || ''
  const sellerName = listing?.profiles?.full_name || listing?.seller_name || 'Seller'
  const sellerAvatar = listing?.profiles?.avatar_url || listing?.seller_avatar

  const toggleWishlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUserId) {
      toast.error('Please sign in to save listings')
      return
    }

    setWishlistLoading(true)
    const newState = !wishlisted
    setWishlisted(newState) // Optimistic

    try {
      if (newState) {
        const { error } = await supabase
          .from('wishlists')
          .insert({ user_id: currentUserId, listing_id: listing.id })
        if (error) throw error
        toast.success('Added to wishlist')
      } else {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', currentUserId)
          .eq('listing_id', listing.id)
        if (error) throw error
        toast.success('Removed from wishlist')
      }
      onWishlistChange?.(listing.id, newState)
    } catch (err) {
      setWishlisted(!newState) // Revert
      toast.error('Failed to update wishlist')
    } finally {
      setWishlistLoading(false)
    }
  }

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 
        card-hover shadow-sm">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          <Image
            src={thumbnail}
            alt={listing.title || 'Animal listing'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          {/* Category Badge */}
          {categoryName && (
            <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm 
              rounded-full text-xs font-semibold text-stone-700 shadow-sm">
              {getCategoryEmoji(categorySlug)} {categoryName}
            </span>
          )}

          {/* Wishlist Button */}
          {showWishlist && (
            <button
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center 
                rounded-full shadow-sm transition-all duration-200 ${
                wishlisted
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white/90 backdrop-blur-sm text-stone-400 hover:text-red-500 hover:bg-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Sold Overlay */}
          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
              <span className="px-4 py-2 bg-blue-500 text-white font-bold rounded-full text-sm">SOLD</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-stone-800 line-clamp-2 text-sm leading-snug mb-2 
            group-hover:text-primary-600 transition-colors">
            {listing.title}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-primary-600">
              {formatPrice(listing.price)}
            </span>
            {listing.price_type === 'negotiable' && (
              <span className="text-[10px] font-medium px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full">
                Negotiable
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {listing.age_value && listing.age_unit && (
              <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                {formatAge(listing.age_value, listing.age_unit)}
              </span>
            )}
            {listing.gender && listing.gender !== 'unknown' && (
              <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full capitalize">
                {listing.gender}
              </span>
            )}
            {listing.health_status && listing.health_status !== 'unknown' && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full capitalize">
                {listing.health_status}
              </span>
            )}
          </div>

          {/* Location */}
          {(listing.city || listing.state) && (
            <div className="flex items-center gap-1 text-xs text-stone-400 mb-3">
              <MapPin className="w-3 h-3" />
              <span>{[listing.city, listing.state].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {/* Seller */}
          <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
            {sellerAvatar ? (
              <Image
                src={sellerAvatar}
                alt={sellerName}
                width={20}
                height={20}
                className="rounded-full"
              />
            ) : (
              <div className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-[8px] font-bold text-primary-600">{sellerName[0]}</span>
              </div>
            )}
            <span className="text-xs text-stone-500 truncate">{sellerName}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Skeleton variant for loading states
export function ListingCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
      <div className="aspect-[4/3] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton w-3/4" />
        <div className="h-4 skeleton w-1/2" />
        <div className="h-6 skeleton w-1/3" />
        <div className="flex gap-1.5">
          <div className="h-5 skeleton w-14 rounded-full" />
          <div className="h-5 skeleton w-12 rounded-full" />
        </div>
        <div className="h-3 skeleton w-2/3" />
        <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
          <div className="w-5 h-5 skeleton rounded-full" />
          <div className="h-3 skeleton w-20" />
        </div>
      </div>
    </div>
  )
}
