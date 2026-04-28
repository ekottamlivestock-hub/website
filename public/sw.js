// Service Worker for Push Notifications
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/logo.png', // Uses the Ekottam logo we saved in public/
      badge: '/logo.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/',
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  // Only follow URLs that resolve to our own origin. A malicious
  // notification payload (or a future bug that lets one slip through)
  // could otherwise redirect the user to a phishing site on click.
  // Treat the configured URL as relative-or-absolute, then verify the
  // origin before opening.
  const raw = event.notification.data && event.notification.data.url
  if (!raw) return
  try {
    const url = new URL(raw, self.location.origin)
    if (url.origin !== self.location.origin) return
    event.waitUntil(clients.openWindow(url.toString()))
  } catch {
    // malformed URL — ignore silently
  }
})
