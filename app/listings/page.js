import { createClient } from '@/lib/supabase-server'
import ListingsClient from './ListingsClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Browse Listings',
  description: 'Find the best livestock available around you.',
}

// Sanitize user input before interpolating into PostgREST filter strings.
// Strips characters that have special meaning in PostgREST operators (,  .  (  )  "  '  \)
// to prevent filter injection via crafted query parameters.
function sanitizeFilter(str) {
  if (!str) return ''
  return str.replace(/[,.()"'\\%]/g, '').trim()
}

export default async function ListingsPage({ searchParams }) {
  const supabase = createClient()
  
  // Extract specific filters from URL
  const q = searchParams?.q || ''
  const category = searchParams?.category || ''
  const breed = searchParams?.breed || ''
  const minPrice = searchParams?.minPrice || ''
  const maxPrice = searchParams?.maxPrice || ''
  const state = searchParams?.state || ''
  const city = searchParams?.city || ''
  const gender = searchParams?.gender || ''
  const health = searchParams?.health || ''
  const sort = searchParams?.sort || 'latest'
  const page = parseInt(searchParams?.page || '1')
  
  const ITEMS_PER_PAGE = 12

  // 1. Fetch Categories
  const { data: categories } = await supabase
    .from('animal_categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // 2. Fetch Breeds if category is selected
  let breeds = []
  if (category) {
    const cat = categories?.find(c => c.slug === category)
    if (cat) {
      const { data } = await supabase
        .from('animal_breeds')
        .select('*')
        .eq('category_id', cat.id)
        .eq('is_active', true)
        .order('name')
      breeds = data || []
    }
  }

  // 3. Build query for listings
  let query = supabase
    .from('listings')
    .select(`
      *,
      animal_categories (name, slug),
      profiles (full_name, avatar_url),
      listing_media (url, sort_order)
    `, { count: 'exact' })
    .eq('status', 'approved')

  if (q) {
    const sq = sanitizeFilter(q)
    if (sq) query = query.or(`title.ilike.%${sq}%,description.ilike.%${sq}%`)
  }
  if (category) {
    const cat = categories?.find(c => c.slug === category)
    if (cat) query = query.eq('category_id', cat.id)
  }
  if (breed) query = query.eq('breed_id', breed)
  if (minPrice) query = query.gte('price', parseInt(minPrice))
  if (maxPrice) query = query.lte('price', parseInt(maxPrice))
  if (state) { const ss = sanitizeFilter(state); if (ss) query = query.ilike('state', `%${ss}%`) }
  if (city) { const sc = sanitizeFilter(city); if (sc) query = query.ilike('city', `%${sc}%`) }
  if (gender) query = query.eq('gender', gender)
  if (health) query = query.eq('health_status', health)

  // Sort
  switch (sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  // Pagination
  const from = (page - 1) * ITEMS_PER_PAGE
  query = query.range(from, from + ITEMS_PER_PAGE - 1)

  const { data: listings, count } = await query

  // 4. Get User and Wishlists
  const { data: { user } } = await supabase.auth.getUser()
  let wishlistedIds = []
  if (user) {
    const { data: wishlist } = await supabase
      .from('wishlists')
      .select('listing_id')
      .eq('user_id', user.id)
    wishlistedIds = wishlist?.map(w => w.listing_id) || []
  }

  return (
    <ListingsClient 
      initialListings={listings || []} 
      totalCount={count || 0}
      categories={categories || []}
      breeds={breeds || []}
      user={user}
      wishlistedIds={wishlistedIds}
      searchParams={searchParams}
    />
  )
}
