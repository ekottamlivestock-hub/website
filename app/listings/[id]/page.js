'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatAge, timeAgo, sendNotification, COMPANY_CONTACT, buildListingEnquiryWhatsApp } from '@/lib/helpers'
import ListingGrid from '@/components/ListingGrid'
import StarRating from '@/components/StarRating'
import toast from 'react-hot-toast'
import {
  Heart, MapPin, Eye, Calendar, Weight, Phone,
  ShieldCheck, ChevronLeft, ChevronRight, Flag, ShoppingCart,
  X, Loader2, Share2, Check
} from 'lucide-react'

const WhatsAppIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
)

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
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [orderForm, setOrderForm] = useState({ quantity: 1, delivery_address: '', buyer_note: '' })
  const [reportReason, setReportReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchData = async (currentUser) => {
      setLoading(true)

      let currentProfile = null
      try {
        if (currentUser) {
          const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle()
          if (profErr) console.error('Profile fetch error:', profErr)
          currentProfile = prof || null
          if (!cancelled) setProfile(currentProfile)
        }

        const { data: listingData, error } = await supabase
          .from('listings')
          .select(`
            *,
            animal_categories (name, slug),
            animal_breeds (name),
            profiles (id, full_name, avatar_url, city, state)
          `)
          .eq('id', id)
          .maybeSingle()

        if (cancelled) return

        if (error || !listingData) {
          console.error("Listing fetch error:", error)
          toast.error('Listing not found')
          router.push('/listings')
          return
        }

        if (!cancelled) {
          setListing(listingData)
          setSeller(listingData.profiles)
        }

        const { data: mediaData } = await supabase
          .from('listing_media')
          .select('*')
          .eq('listing_id', id)
          .order('sort_order')
        if (!cancelled) setMedia(mediaData || [])

        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewee_id', listingData.seller_id)
        if (!cancelled && reviews && reviews.length > 0) {
          const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          setSellerRating({ avg: avg.toFixed(1), count: reviews.length })
        }

        if (currentUser) {
          const { data: wl, error: wlError } = await supabase
            .from('wishlists')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('listing_id', id)
            .maybeSingle()
          if (!cancelled && !wlError) setWishlisted(!!wl)
        }

        let categoryId = listingData.category_id || listingData.animal_categories?.id
        if (categoryId) {
          const { data: similar } = await supabase
            .from('listings')
            .select(`
              *,
              animal_categories (name, slug),
              profiles (full_name, avatar_url),
              listing_media (url, sort_order)
            `)
            .eq('category_id', categoryId)
            .eq('status', 'approved')
            .neq('id', id)
            .limit(4)
          if (!cancelled) setSimilarListings(similar || [])
        }

        // Only count views from real prospective buyers — skip the seller
        // viewing their own listing and skip admins reviewing it. Anonymous
        // visitors still count.
        const isOwnListing = currentUser && currentUser.id === listingData.seller_id
        const isAdmin = currentProfile?.role === 'admin'
        if (!isOwnListing && !isAdmin) {
          try {
            await supabase.rpc('increment_view_count', { p_listing_id: id })
          } catch (viewErr) {
            console.warn('View count increment failed:', viewErr)
          }
        }
      } catch (err) {
        console.error("Error in fetchData:", err)
        if (!cancelled) toast.error("Failed to load listing details.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled) return
        setUser(session?.user || null)
        fetchData(session?.user || null)
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
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
        toast.success('Saved to wishlist')
      } else {
        await supabase.from('wishlists').delete().eq('user_id', user.id).eq('listing_id', id)
        toast.success('Removed from wishlist')
      }
    } catch {
      setWishlisted(!newState)
      toast.error('Failed to update wishlist')
    }
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const payload = {
      title: listing?.title || 'ekottam listing',
      text: 'Check out this listing on ekottam',
      url,
    }
    try {
      if (navigator.share) {
        await navigator.share(payload)
      } else {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        toast.success('Link copied')
        setTimeout(() => setShareCopied(false), 1800)
      }
    } catch {
      // user cancelled — ignore
    }
  }

  const handleOrder = async () => {
    if (!user) { toast.error('Please sign in to place an order'); return }
    if (user.id === listing.seller_id) {
      toast.error("You can't purchase your own listing")
      return
    }
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
      <div className="min-h-screen bg-surface-50">
        <div className="page-container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <div className="aspect-[4/3] skeleton rounded-3xl" />
              <div className="flex gap-2">
                {[1,2,3,4].map(i => <div key={i} className="w-20 h-20 skeleton rounded-xl" />)}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="h-4 skeleton w-24" />
              <div className="h-10 skeleton w-3/4" />
              <div className="h-12 skeleton w-1/2" />
              <div className="h-32 skeleton rounded-2xl" />
              <div className="h-48 skeleton rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!listing) return null

  const images = media.length > 0 ? media.map(m => m.url) : ['/images/1.jpg']

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-20">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest-plus text-surface-500 mb-6">
          <Link href="/listings" className="hover:text-primary-700 transition-colors">All Listings</Link>
          {listing.animal_categories && (
            <>
              <span className="text-surface-300">/</span>
              <Link href={`/listings?category=${listing.animal_categories.slug}`} className="hover:text-primary-700 transition-colors">
                {listing.animal_categories.name}
              </Link>
            </>
          )}
          <span className="text-surface-300">/</span>
          <span className="text-surface-ink normal-case tracking-normal truncate max-w-[40ch]">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* LEFT: Gallery + Description */}
          <div className="lg:col-span-7 xl:col-span-8">
            {/* Gallery */}
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-surface-100 shadow-lift">
                <Image
                  src={images[currentImageIndex]}
                  alt={listing.title}
                  fill
                  className="object-cover transition-opacity duration-500"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority
                />

                {/* Floating badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {listing.animal_categories && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                      bg-white/95 backdrop-blur-sm text-[11px] font-semibold text-surface-ink shadow-soft tracking-wide">
                      {listing.animal_categories.name}
                    </span>
                  )}
                  {listing.price_type === 'auction' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                      bg-surface-ink/90 backdrop-blur-sm text-[11px] font-semibold text-white tracking-wide">
                      Auction
                    </span>
                  )}
                </div>

                {/* Floating actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={handleShare}
                    aria-label="Share"
                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm text-surface-ink hover:bg-white shadow-soft flex items-center justify-center transition-all"
                  >
                    {shareCopied ? <Check className="w-4 h-4 text-primary-600" /> : <Share2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={toggleWishlist}
                    aria-label={wishlisted ? 'Remove from wishlist' : 'Save'}
                    className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center shadow-soft transition-all ${
                      wishlisted
                        ? 'bg-accent-500 text-white'
                        : 'bg-white/90 text-surface-ink hover:bg-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(i => i === 0 ? images.length - 1 : i - 1)}
                      aria-label="Previous image"
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 backdrop-blur-sm text-surface-ink rounded-full flex items-center justify-center hover:bg-white shadow-lift transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(i => i === images.length - 1 ? 0 : i + 1)}
                      aria-label="Next image"
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 backdrop-blur-sm text-surface-ink rounded-full flex items-center justify-center hover:bg-white shadow-lift transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface-ink/75 backdrop-blur-sm text-white text-[11px] font-semibold tracking-wide tabular">
                      {currentImageIndex + 1} / {images.length}
                    </span>
                  </>
                )}

                {/* Sold overlay */}
                {listing.status === 'sold' && (
                  <div className="absolute inset-0 bg-surface-ink/70 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="font-display text-4xl italic text-white/95 tracking-wide">Sold</span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {images.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      aria-label={`View image ${i + 1}`}
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 transition-all ${
                        currentImageIndex === i
                          ? 'ring-2 ring-primary-600 ring-offset-2 ring-offset-surface-50'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image src={url} alt="" fill className="object-cover" sizes="96px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Editorial header (below gallery on desktop — stays readable) */}
            <div className="mt-10">
              <p className="eyebrow text-[11px]">
                Posted {timeAgo(listing.created_at)}
                {listing.city && <> · {listing.city}, {listing.state}</>}
              </p>
              <h1 className="mt-2 font-display text-display-lg text-surface-ink text-balance">
                {listing.title}
              </h1>

              {/* Spec strip */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-b border-surface-200/70 divide-x divide-surface-200/70">
                {[
                  { label: 'Age', value: listing.age_value && listing.age_unit ? formatAge(listing.age_value, listing.age_unit) : '—' },
                  { label: 'Gender', value: listing.gender && listing.gender !== 'unknown' ? listing.gender.charAt(0).toUpperCase() + listing.gender.slice(1) : '—' },
                  { label: 'Weight', value: listing.weight_kg ? `${listing.weight_kg} kg` : '—' },
                  { label: 'Breed', value: listing.animal_breeds?.name || '—' },
                ].map((item, i) => (
                  <div key={i} className="px-4 py-5 first:pl-0 sm:first:pl-4 sm:last:pr-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest-plus text-surface-500">{item.label}</p>
                    <p className="mt-1.5 font-display text-lg text-surface-ink truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="mt-10">
                <div className="section-eyebrow">About this animal</div>
                <h2 className="font-display text-2xl text-surface-ink mb-4">A closer look</h2>
                <p className="text-[15px] leading-[1.75] text-surface-600 whitespace-pre-wrap max-w-3xl">
                  {listing.description || 'No description provided by the seller.'}
                </p>
              </div>

              {/* Additional details */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
                {[
                  { label: 'Health status', value: listing.health_status ? listing.health_status.charAt(0).toUpperCase() + listing.health_status.slice(1) : '—', icon: ShieldCheck },
                  { label: 'Quantity available', value: listing.quantity || 1, icon: ShoppingCart },
                  { label: 'Views', value: (listing.view_count || 0).toLocaleString(), icon: Eye },
                  { label: 'Listed', value: new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), icon: Calendar },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest-plus text-surface-500">{item.label}</p>
                      <p className="mt-1 text-[15px] font-semibold text-surface-ink tabular">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vaccinations */}
              {listing.vaccination_tags?.length > 0 && (
                <div className="mt-12">
                  <div className="section-eyebrow">Care records</div>
                  <h3 className="font-display text-2xl text-surface-ink mb-5">Vaccinations & health</h3>
                  <div className="flex flex-wrap gap-2">
                    {listing.vaccination_tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-primary-200/70 text-primary-800 text-sm font-semibold rounded-full shadow-soft">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Report */}
              <div className="mt-12 pt-8 border-t border-surface-200/70">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest-plus text-surface-500 hover:text-red-600 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" /> Report this listing
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Sticky enquiry sidebar */}
          <aside className="lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Price card */}
              <div className="bg-white border border-surface-200/70 rounded-3xl p-6 shadow-lift">
                <p className="text-[10px] font-semibold uppercase tracking-widest-plus text-surface-500">
                  {listing.price_type === 'auction' ? 'Starting bid' : listing.price_type === 'negotiable' ? 'Asking price · Negotiable' : 'Asking price'}
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-display text-4xl text-primary-800 tabular tracking-tight">
                    {formatPrice(listing.price)}
                  </span>
                  {listing.quantity > 1 && (
                    <span className="text-sm text-surface-500">/ animal</span>
                  )}
                </div>

                {/* Location + posted */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-surface-500">
                  {(listing.city || listing.state) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {[listing.city, listing.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {(listing.view_count || 0).toLocaleString()} views
                  </span>
                </div>

                <div className="my-6 h-px bg-surface-200/70" />

                {/* Enquiry — routes through ekottam */}
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest-plus text-primary-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Enquire via ekottam
                  </p>
                  <p className="text-[13px] text-surface-500 leading-relaxed">
                    For your safety, all enquiries go through our team. We verify every seller and connect you directly.
                  </p>

                  <a
                    href={buildListingEnquiryWhatsApp(listing)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-base w-full bg-[#25D366] text-white px-5 py-4 hover:bg-[#1ebe57] shadow-lift hover:shadow-float hover:-translate-y-0.5"
                  >
                    <WhatsAppIcon className="w-5 h-5" />
                    WhatsApp ekottam
                  </a>
                  <a
                    href={`tel:${COMPANY_CONTACT.phoneTel}`}
                    className="btn-base w-full bg-surface-ink text-white px-5 py-4 hover:bg-primary-900 shadow-soft"
                  >
                    <Phone className="w-4 h-4" />
                    Call {COMPANY_CONTACT.phoneDisplay}
                  </a>
                  <button
                    onClick={() => user ? setShowOrderModal(true) : toast.error('Please sign in to order')}
                    className="btn-base w-full border border-surface-ink text-surface-ink bg-transparent px-5 py-4 hover:bg-surface-ink hover:text-white"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Place an order
                  </button>
                </div>
              </div>

              {/* Seller card */}
              {seller && (
                <div className="bg-surface-100/70 border border-surface-200/70 rounded-3xl p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-widest-plus text-surface-500 mb-4">
                    Sold by
                  </p>
                  <div className="flex items-center gap-4">
                    {seller.avatar_url ? (
                      <Image
                        src={seller.avatar_url}
                        alt={seller.full_name}
                        width={52}
                        height={52}
                        className="rounded-full border border-surface-200"
                      />
                    ) : (
                      <div className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="font-display text-xl text-primary-800">
                          {seller.full_name?.[0] || 'S'}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-display text-lg text-surface-ink truncate">{seller.full_name || 'Verified seller'}</h4>
                        <ShieldCheck className="w-4 h-4 text-primary-700 shrink-0" strokeWidth={2.5} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-surface-500">
                        {(seller.city || seller.state) && (
                          <span className="truncate">{[seller.city, seller.state].filter(Boolean).join(', ')}</span>
                        )}
                        {sellerRating && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-surface-300" />
                            <span className="inline-flex items-center gap-1">
                              <StarRating rating={parseFloat(sellerRating.avg)} size={12} />
                              <span className="tabular">({sellerRating.count})</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-[12px] text-surface-500 leading-relaxed">
                    Verified farmer on ekottam. Identity & livestock documents checked by our team.
                  </p>
                </div>
              )}

              {/* Trust note */}
              <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-primary-50/60 border border-primary-100/80">
                <ShieldCheck className="w-4 h-4 text-primary-700 shrink-0 mt-0.5" />
                <p className="text-[12px] leading-relaxed text-primary-900">
                  <span className="font-semibold">100% buyer protection.</span> Never pay in advance before seeing the animal. Always meet in a safe public place.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Similar listings */}
        {similarListings.length > 0 && (
          <section className="mt-24">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="section-eyebrow">You may also like</div>
                <h2 className="font-display text-display-md text-surface-ink">Similar livestock</h2>
              </div>
              <Link
                href={`/listings${listing.animal_categories ? `?category=${listing.animal_categories.slug}` : ''}`}
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
              >
                Browse all →
              </Link>
            </div>
            <ListingGrid
              listings={similarListings}
              currentUserId={user?.id}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            />
          </section>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-ink/60 backdrop-blur-sm" onClick={() => setShowOrderModal(false)} />
          <div className="relative bg-surface-50 rounded-3xl max-w-md w-full p-8 shadow-float">
            <button
              onClick={() => setShowOrderModal(false)}
              aria-label="Close"
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white border border-surface-200 flex items-center justify-center text-surface-500 hover:bg-surface-100"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="eyebrow text-[10px]">Secure purchase</p>
            <h3 className="mt-1 font-display text-2xl text-surface-ink">Place your order</h3>
            <div className="mt-6 space-y-5">
              <div>
                <label className="input-label">Quantity</label>
                <input
                  type="number" min="1" max={listing.quantity || 1}
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm(f => ({...f, quantity: parseInt(e.target.value) || 1}))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Delivery address</label>
                <textarea
                  value={orderForm.delivery_address}
                  onChange={(e) => setOrderForm(f => ({...f, delivery_address: e.target.value}))}
                  rows={3} className="input-field" placeholder="Street, city, state, pincode" required
                />
              </div>
              <div>
                <label className="input-label">Note to seller (optional)</label>
                <textarea
                  value={orderForm.buyer_note}
                  onChange={(e) => setOrderForm(f => ({...f, buyer_note: e.target.value}))}
                  rows={2} className="input-field" placeholder="Any special instructions"
                />
              </div>
              <div className="rounded-2xl bg-surface-100 p-5 border border-surface-200/70">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Price per animal</span>
                  <span className="font-semibold tabular">{formatPrice(listing.price)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-surface-500">Quantity</span>
                  <span className="font-semibold tabular">× {orderForm.quantity}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-surface-200 flex justify-between items-baseline">
                  <span className="font-semibold text-surface-ink">Total</span>
                  <span className="font-display text-2xl text-primary-800 tabular">
                    {formatPrice(listing.price * orderForm.quantity)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleOrder}
                disabled={submitting || !orderForm.delivery_address}
                className="btn-primary w-full"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                {submitting ? 'Placing order…' : 'Confirm order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-ink/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)} />
          <div className="relative bg-surface-50 rounded-3xl max-w-md w-full p-8 shadow-float">
            <button
              onClick={() => setShowReportModal(false)}
              aria-label="Close"
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white border border-surface-200 flex items-center justify-center text-surface-500 hover:bg-surface-100"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="eyebrow text-[10px] text-red-600">Flag for review</p>
            <h3 className="mt-1 font-display text-2xl text-surface-ink">Report this listing</h3>
            <p className="mt-2 text-sm text-surface-500">
              Help us keep ekottam safe. Our team reviews every report within 24 hours.
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <label className="input-label">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select a reason</option>
                  <option value="fake_listing">Fake or misleading listing</option>
                  <option value="wrong_price">Incorrect pricing</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="fraud">Suspected fraud</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button
                onClick={handleReport}
                disabled={submitting || !reportReason}
                className="btn-danger w-full"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
