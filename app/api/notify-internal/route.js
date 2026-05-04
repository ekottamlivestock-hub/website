import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { checkRateLimit } from '@/lib/ratelimit'
import { isSameOrigin, csrfReject } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

// Every notification.type the app emits today. Mirrors the CHECK
// constraint added in migration 013. Keep this in lockstep with the DB.
const ALL_TYPES = new Set([
  // order lifecycle
  'new_order', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled',
  // listing lifecycle
  'listing_approved', 'listing_rejected', 'listing_paused', 'listing_unpaused',
  'new_listing_pending',
  // seller lifecycle
  'new_seller_application',
  'seller_approved', 'seller_rejected',
  'seller_suspended', 'seller_reactivated', 'seller_removed',
])

// Types that ONLY an admin actor may send. A non-admin trying to send
// these is forging an admin action ("you've been approved!" etc.) and
// must be rejected.
const ADMIN_ONLY_TYPES = new Set([
  'listing_approved', 'listing_rejected', 'listing_paused', 'listing_unpaused',
  'seller_approved', 'seller_rejected',
  'seller_suspended', 'seller_reactivated', 'seller_removed',
])

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// Validate that the (actor, recipient, type, metadata) tuple represents
// a legitimate flow in the app. Admins are trusted to send anything;
// everyone else must be a real party to the underlying entity.
async function validateNonAdmin({ actorId, recipientId, type, metadata, supabaseAdmin }) {
  if (ADMIN_ONLY_TYPES.has(type)) return false

  // Order lifecycle — actor must be a party to the order, recipient
  // must be the OTHER party.
  if (type === 'new_order' || type === 'order_cancelled') {
    if (!metadata?.order_id) return false
    const { data: order } = await supabaseAdmin
      .from('orders').select('buyer_id, seller_id')
      .eq('id', metadata.order_id).maybeSingle()
    if (!order) return false
    // Both directions are buyer → seller for these types.
    return order.buyer_id === actorId && order.seller_id === recipientId
  }
  if (type === 'order_confirmed' || type === 'order_shipped' || type === 'order_delivered') {
    if (!metadata?.order_id) return false
    const { data: order } = await supabaseAdmin
      .from('orders').select('buyer_id, seller_id')
      .eq('id', metadata.order_id).maybeSingle()
    if (!order) return false
    return order.seller_id === actorId && order.buyer_id === recipientId
  }

  // Notify-admin types — actor must own the entity referenced; recipient
  // must actually be an admin (so a non-admin can't smuggle the message
  // to a regular user under an admin-looking type).
  if (type === 'new_listing_pending') {
    if (!metadata?.listing_id) return false
    const { data: listing } = await supabaseAdmin
      .from('listings').select('seller_id')
      .eq('id', metadata.listing_id).maybeSingle()
    if (!listing || listing.seller_id !== actorId) return false
    const { data: recipient } = await supabaseAdmin
      .from('profiles').select('role').eq('id', recipientId).maybeSingle()
    return recipient?.role === 'admin'
  }
  if (type === 'new_seller_application') {
    // Actor is the applicant — metadata.user_id should match.
    if (metadata?.user_id && metadata.user_id !== actorId) return false
    const { data: recipient } = await supabaseAdmin
      .from('profiles').select('role').eq('id', recipientId).maybeSingle()
    return recipient?.role === 'admin'
  }

  // Anything else falls through unauthorised.
  return false
}

export async function POST(req) {
  // CSRF defence: reject any cross-origin request before doing auth work.
  // The auth cookie alone is not enough to authorise a notification insert.
  if (!isSameOrigin(req)) return csrfReject()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: 'Server configuration error' }, 503)
  }

  // 1. Authenticate the caller through the user's session cookie.
  const supabaseAuth = createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  // 1b. Per-user HTTP rate limit. 60 attempts/min covers any legitimate
  //     foreground UI flow (admin bulk-approve fans out << 60/min, a
  //     buyer placing one order fires 1). Anything beyond is automation.
  const rl = await checkRateLimit(supabaseAuth, 'notify-internal', user.id, 60, 60)
  if (!rl.ok) return json({ error: 'Too many requests. Please slow down.' }, 429)

  // 2. Parse and validate the request body.
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const { userId, type, message, metadata } = body || {}
  if (!userId || !type || !message) return json({ error: 'Missing required fields' }, 400)
  if (!ALL_TYPES.has(type)) return json({ error: 'Unknown notification type' }, 400)
  if (typeof message !== 'string' || message.length > 500) {
    return json({ error: 'Message too long' }, 400)
  }
  if (typeof userId !== 'string') return json({ error: 'Invalid userId' }, 400)

  // 3. Look up the actor's role to decide whether to skip relationship checks.
  const { data: actorProfile } = await supabaseAuth
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isAdmin = actorProfile?.role === 'admin'

  // 4. Service-role client for the trusted insert (bypasses RLS, but the
  //    BEFORE-INSERT triggers still set from_user_id and rate-limit).
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // 5. Authorize. Admins skip; everyone else has to prove the relationship.
  if (!isAdmin) {
    const ok = await validateNonAdmin({
      actorId: user.id,
      recipientId: userId,
      type,
      metadata,
      supabaseAdmin,
    })
    if (!ok) return json({ error: 'Forbidden' }, 403)
  }

  // 6. Insert. We set from_user_id explicitly because the BEFORE trigger
  //    falls back to auth.uid(), which is NULL when service role is used.
  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type,
    message,
    metadata: metadata || {},
    is_read: false,
    from_user_id: user.id,
  })
  if (error) {
    // Rate-limit and CHECK-constraint errors come back here. Bubble them
    // up so the caller can decide whether to retry / surface to the user.
    console.error('notify-internal insert error:', error)
    return json({ error: error.message || 'Insert failed' }, 500)
  }

  return json({ ok: true }, 200)
}
