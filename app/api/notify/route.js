import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { isSameOrigin, csrfReject } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  // CSRF defence: reject any cross-origin request before doing auth work.
  // The auth cookie alone is not enough to authorise a state-changing call.
  if (!isSameOrigin(req)) return csrfReject()

  // Initialize at request time (not build time) to avoid missing env var errors
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: 'Push notifications are not configured (missing VAPID keys)' }), { status: 503 })
  }

  if (!supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error (missing service role key)' }), { status: 503 })
  }

  webpush.setVapidDetails('mailto:info@ekottam.in', vapidPublicKey, vapidPrivateKey)

  // Service role client bypasses RLS
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Authenticate the caller using the server-side client
    const supabaseAuth = createServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    // Assuming only admins or system processes should trigger this endpoint
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    const { userId, title, body, url } = await req.json()
    
    if (!userId || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    // 1. Fetch user's push subscriptions from DB using admin client
    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, id')
      .eq('user_id', userId)
      
    if (error) throw error
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ message: 'User has no active subscriptions' }), { status: 200 })
    }

    const payload = JSON.stringify({ title, body, url })

    // 2. Transmit push event to all of this user's registered devices (phones, laptops, etc.)
    const sendPromises = subs.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
      }

      try {
        await webpush.sendNotification(pushSubscription, payload)
      } catch (err) {
        // If the subscription is expired or revoked (410 Gone), remove it from DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('Error sending push:', err)
        }
      }
    })

    await Promise.all(sendPromises)

    return new Response(JSON.stringify({ success: true, deliveries: subs.length }), { status: 200 })

  } catch (error) {
    console.error('Push Notification Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to send notification' }), { status: 500 })
  }
}
