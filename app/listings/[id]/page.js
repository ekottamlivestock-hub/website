'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatAge, getCategoryEmoji, timeAgo, sendNotification } from '@/lib/helpers'
import ListingGrid from '@/components/ListingGrid'
import StarRating from '@/components/StarRating'
import StatusBadge from '@/components/StatusBadge'
import toast from 'react-hot-toast'
import {
  Heart, MapPin, Eye, Calendar, Weight, Tag, Phone,
  ShieldCheck, ChevronLeft, ChevronRight, Flag, ShoppingCart,
  X, Loader2, MessageCircle
} from 'lucide-react'

export default function ListingDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [listing, setListing] = useState(null)
  const [media, setMedia] = useState([])
  const [seller, setSeller] = useState(null)
  const [sellerRating, setSellerRating] = useState(null)
  const [similarListings, setSimilarListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wishlisted, setWishlisted] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showPhone, setShowPhone] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [orderForm, setOrderForm] = useState({ quantity: 1, delivery_address: '', buyer_note: '' })
  const [reportReason, setReportReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // Session
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)

      if (session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(prof)
      }

      // Listing
      const { data: listingData, error } = await supabase
        .from('listings')
        .select(`
          *,
          animal_categories (name, slug),
          animal_breeds (name),
          profiles (id, full_name, avatar_url, phone, city, state)
        `)
        .eq('id', id)
        .single()

      if (error || !listingData) {
        toast.error('Listing not found')
        router.push('/listings')
        return
      }

      setListing(listingData)
      setSeller(listingData.profiles)

      // Media
      const { data: mediaData } = await supabase
        .from('listing_media')
        .select('*')
        .eq('listing_id', id)
        .order('sort_order')
      setMedia(mediaData || [])

      // Seller rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', listingData.seller_id)
      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        setSellerRating({ avg: avg.toFixed(1), count: reviews.length })
      }

      // Wishlist check
      if (session?.user) {
        const { data: wl } = await supabase
          .from('wishlists')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('listing_id', id)
          .maybeSingle()
        setWishlisted(!!wl)
      }

      // Similar listings
      const { data: similar } = await supabase
        .from('listings')
        .select(`
          *,
          animal_categories (name, slug),
          profiles (full_name, avatar_url),
          listing_media (url, sort_order)
        `)
        .eq('category_id', listingData.category_id)
        .eq('status', 'approved')
        .neq('id', id)
        .limit(4)
      setSimilarListings(similar || [])

      // Increment view count
      await supabase.rpc('increment_view_count', { listing_id: id }).catch(() => {
        // Fallback if RPC doesn't exist
        supabase
          .from('listings')
          .update({ view_count: (listingData.view_count || 0) + 1 })
          .eq('id', id)
          .then()
      })

      setLoading(false)
    }
    fetchData()
  }, [id, router])

  const toggleWishlist = async () => {
    if (!user) {
      toast.error('Please sign in to save listings')
      return
    }
    const newState = !wishlisted
    setWishlisted(newState)
    try {
      if (newState) {
        await supabase.from('wishlists').insert({ user_id: user.id, listing_id: id })
        toast.success('Added to wishlist')
      } else {
        await supabase.from('wishlists').delete().eq('user_id', user.id).eq('listing_id', id)
        toast.success('Removed from wishlist')
      }
    } catch {
      setWishlisted(!newState)
      toast.error('Failed to update wishlist')
    }
  }

  const handleOrder = async () => {
    if (!user) { toast.error('Please sign in to place an order'); return }
    setSubmitting(true)
    try {
      const totalPrice = listing.price * orderForm.quantity
      const { error } = await supabase.from('orders').insert({
        listing_id: id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        quantity: orderForm.quantity,
        total_price: totalPrice,
        delivery_address: orderForm.delivery_address,
        buyer_note: orderForm.buyer_note,
        status: 'pending',
        payment_status: 'unpaid',
      })
      if (error) throw error

      await sendNotification(
        listing.seller_id,
        'new_order',
        `New order for "${listing.title}" from ${profile?.full_name || 'a buyer'}`,
        { listing_id: id }
      )

      toast.success('Order placed successfully!')
      setShowOrderModal(false)
      router.push('/buyer/orders')
    } catch (err) {
      toast.error('Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReport = async () => {
    if (!user) { toast.error('Please sign in to report'); return }
    if (!reportReason.trim()) { toast.error('Please provide a reason'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        listing_id: id,
        reason: reportReason,
      })
      if (error) throw error
      toast.success('Report submitted. We\'ll review it shortly.')
      setShowReportModal(false)
      setReportReason('')
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="aspect-[4/3] skeleton rounded-2xl" />
            <div className="flex gap-2">
              {[1,2,3].map(i => <div key={i} className="w-20 h-20 skeleton rounded-xl" />)}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 skeleton w-3/4" />
            <div className="h-10 skeleton w-1/3" />
            <div className="h-4 skeleton w-full" />
            <div className="h-4 skeleton w-2/3" />
            <div className="h-32 skeleton rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!listing) return null

  const images = media.length > 0 ? media.map(m => m.url) : ['/images/1.jpg']

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-400 mb-6">
        <Link href="/listings" className="hover:text-primary-600">Listings</Link>
        <span>/</span>
        {listing.animal_categories && (
          <>
            <Link href={`/listings?category=${listing.animal_categories.slug}`} className="hover:text-primary-600">
              {listing.animal_categories.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-stone-600 truncate">{listing.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Images */}
        <div className="lg:col-span-3">
          {/* Main Image */}
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 mb-3">
            <Image
              src={images[currentImageIndex]}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex(i => i === 0 ? images.length - 1 : i - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/60"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(i => i === images.length - 1 ? 0 : i + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/60"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 backdrop-blur text-white text-xs rounded-full">
                  {currentImageIndex + 1} / {images.length}
                </span>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    currentImageIndex === i ? 'border-primary-500 ring-2 ring-primary-200' : 'border-transparent'
                  }`}
                >
                  <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="mt-8">
            <h3 className="font-semibold text-stone-800 mb-3">Description</h3>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
              {listing.description || 'No description provided.'}
            </p>
          </div>

          {/* Vaccination Tags */}
          {listing.vaccination_tags?.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-stone-800 mb-3">Vaccinations</h3>
              <div className="flex flex-wrap gap-2">
                {listing.vaccination_tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                    ✓ {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title & Price */}
          <div>
            {listing.animal_categories && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 
                text-xs font-semibold rounded-full mb-2">
                {getCategoryEmoji(listing.animal_categories.slug)} {listing.animal_categories.name}
              </span>
            )}
            <h1 className="text-2xl font-bold text-stone-900 mb-2">{listing.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold text-primary-600">
                {formatPrice(listing.price)}
              </span>
              {listing.price_type === 'negotiable' && (
                <span className="px-3 py-1 bg-secondary-50 text-secondary-700 text-xs font-semibold rounded-full">
                  Negotiable
                </span>
              )}
              {listing.price_type === 'auction' && (
                <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">
                  Auction
                </span>
              )}
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Age', value: formatAge(listing.age_value, listing.age_unit), icon: Calendar },
              { label: 'Gender', value: listing.gender ? listing.gender.charAt(0).toUpperCase() + listing.gender.slice(1) : 'N/A', icon: Tag },
              { label: 'Weight', value: listing.weight_kg ? `${listing.weight_kg} kg` : 'N/A', icon: Weight },
              { label: 'Health', value: listing.health_status ? listing.health_status.charAt(0).toUpperCase() + listing.health_status.slice(1) : 'N/A', icon: ShieldCheck },
              { label: 'Quantity', value: listing.quantity || 1, icon: ShoppingCart },
              { label: 'Views', value: listing.view_count || 0, icon: Eye },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <item.icon className="w-4 h-4 text-stone-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-stone-400 uppercase">{item.label}</p>
                  <p className="text-sm font-semibold text-stone-700 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Breed */}
          {listing.animal_breeds && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-stone-400">Breed:</span>
              <span className="font-medium text-stone-700">{listing.animal_breeds.name}</span>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <MapPin className="w-4 h-4" />
            {[listing.city, listing.state].filter(Boolean).join(', ')}
          </div>

          {/* Posted */}
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Calendar className="w-4 h-4" />
            Posted {timeAgo(listing.created_at)}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => user ? setShowOrderModal(true) : toast.error('Please sign in to order')}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" /> Place Order
            </button>
            <button
              onClick={toggleWishlist}
              className={`px-4 py-3 rounded-full border-2 transition-all ${
                wishlisted
                  ? 'bg-red-50 border-red-200 text-red-500'
                  : 'border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200'
              }`}
            >
              <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Seller Card */}
          {seller && (
            <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                {seller.avatar_url ? (
                  <Image src={seller.avatar_url} alt={seller.full_name} width={48} height={48} className="rounded-full" />
                ) : (
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-600">{seller.full_name?.[0]}</span>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-stone-800">{seller.full_name}</h4>
                  <div className="flex items-center gap-2">
                    {seller.city && (
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {seller.city}
                      </span>
                    )}
                    {sellerRating && (
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <StarRating rating={parseFloat(sellerRating.avg)} size={12} />
                        ({sellerRating.count})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact */}
              {showPhone && seller.phone ? (
                <a href={`tel:${seller.phone}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-50 
                    text-primary-700 rounded-xl font-semibold text-sm">
                  <Phone className="w-4 h-4" /> {seller.phone}
                </a>
              ) : (
                <button
                  onClick={() => {
                    if (!user) { toast.error('Please sign in to contact seller'); return }
                    setShowPhone(true)
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 
                    text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all"
                >
                  <Phone className="w-4 h-4" /> Contact Seller
                </button>
              )}
            </div>
          )}

          {/* Report */}
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-500 transition-colors"
          >
            <Flag className="w-3 h-3" /> Report this listing
          </button>
        </div>
      </div>

      {/* Similar Listings */}
      {similarListings.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold text-stone-800 mb-6">Similar Listings</h2>
          <ListingGrid
            listings={similarListings}
            currentUserId={user?.id}
            columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          />
        </section>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowOrderModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 animate-bounce-in shadow-2xl">
            <button onClick={() => setShowOrderModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-stone-800 mb-4">Place Order</h3>
            <div className="space-y-4">
              <div>
                <label className="input-label">Quantity</label>
                <input type="number" min="1" max={listing.quantity || 1} value={orderForm.quantity}
                  onChange={(e) => setOrderForm(f => ({...f, quantity: parseInt(e.target.value) || 1}))}
                  className="input-field" />
              </div>
              <div>
                <label className="input-label">Delivery Address</label>
                <textarea value={orderForm.delivery_address}
                  onChange={(e) => setOrderForm(f => ({...f, delivery_address: e.target.value}))}
                  rows={3} className="input-field" placeholder="Full delivery address..." required />
              </div>
              <div>
                <label className="input-label">Note to Seller (optional)</label>
                <textarea value={orderForm.buyer_note}
                  onChange={(e) => setOrderForm(f => ({...f, buyer_note: e.target.value}))}
                  rows={2} className="input-field" placeholder="Any special instructions..." />
              </div>
              <div className="bg-stone-50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Price per unit</span>
                  <span className="font-medium">{formatPrice(listing.price)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-stone-500">Quantity</span>
                  <span className="font-medium">×{orderForm.quantity}</span>
                </div>
                <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-stone-200">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(listing.price * orderForm.quantity)}</span>
                </div>
              </div>
              <button onClick={handleOrder} disabled={submitting || !orderForm.delivery_address}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                {submitting ? 'Placing...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReportModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 animate-bounce-in shadow-2xl">
            <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-stone-800 mb-4">Report Listing</h3>
            <div className="space-y-4">
              <div>
                <label className="input-label">Reason</label>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="input-field">
                  <option value="">Select a reason</option>
                  <option value="fake_listing">Fake or misleading listing</option>
                  <option value="wrong_price">Incorrect pricing</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="fraud">Suspected fraud</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button onClick={handleReport} disabled={submitting || !reportReason}
                className="w-full btn-danger flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
