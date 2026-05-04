// Origin-header CSRF defence for state-changing API routes.
//
// Modern browsers send `Origin` on every cross-origin fetch and on every
// same-origin POST/PUT/DELETE/PATCH. Comparing `Origin` to the request's
// own host blocks the classic CSRF flow where attacker.com triggers a
// cross-origin POST against our API while carrying the user's auth
// cookie.
//
// If `Origin` is absent we treat the request as untrusted. Server-side
// callers (cron, webhooks) should be authenticated separately — we do
// NOT want to fall through to "allow on missing Origin" here, since
// that's the historical CSRF foothold.

export function isSameOrigin(req) {
  const origin = req.headers.get('origin')
  if (!origin) return false
  try {
    const reqHost = new URL(req.url).host
    const originHost = new URL(origin).host
    return reqHost === originHost
  } catch {
    return false
  }
}

export function csrfReject() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}
