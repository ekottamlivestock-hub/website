import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [isSupported, setIsSupported] = useState(false)

  // Initialize service worker and check support
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        setSubscription(sub)
        setIsSubscribed(true)
      }
    } catch (err) {
      console.error('Service Worker Registration Failed:', err)
    }
  }

  const subscribeToPush = useCallback(async () => {
    try {
      if (!isSupported) {
        alert('Push notifications are not supported in this browser.')
        return
      }

      // Check current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('You must be logged in to enable notifications.')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      })

      // Send to Supabase
      const { endpoint, keys } = sub.toJSON()
      const { error } = await supabase
        .from('push_subscriptions')
        .insert([{
          user_id: session.user.id,
          endpoint: endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        }])
        
      // Also ignore unique-constraint errors (if they reinstall the same sub)
      if (error && error.code !== '23505') {
        console.error('Database Error saving subscription:', error)
        throw error
      }

      setSubscription(sub)
      setIsSubscribed(true)
      return true
    } catch (error) {
      console.error('Failed to subscribe the user: ', error)
      alert(
        'Failed to enable push notifications. You may have blocked permissions in your browser settings.'
      )
      return false
    }
  }, [isSupported])

  return {
    isSupported,
    isSubscribed,
    subscription,
    subscribeToPush
  }
}
