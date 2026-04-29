// Postgres-backed rate limiting via the check_rate_limit RPC added in
// migration 016. Designed to be called from server-side route handlers
// holding an authenticated Supabase client (cookie session OR service
// role — both are fine, the function is SECURITY DEFINER).
//
// Keys are namespaced like "<operation>:<principal-id>" so different
// operations don't share counters (e.g. notify-internal:<uid> is
// independent of report-create:<uid>).

/**
 * @param {object}        client            - A supabase-js client (server or admin).
 * @param {string}        operation         - Short stable label for the operation.
 * @param {string|number} principalId       - The actor identifier (usually auth user id; fall back to IP for unauth flows).
 * @param {number}        maxCount          - Allowed actions per window.
 * @param {number}        windowSeconds     - Window length in seconds.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 *   ok=true if action is allowed; ok=false if rate-limited.
 *   On RPC error returns ok=true so we fail open rather than locking
 *   users out due to a transient DB issue — caller can log error.
 */
export async function checkRateLimit(client, operation, principalId, maxCount, windowSeconds) {
  if (!principalId) return { ok: true } // nothing to key on; let it through
  const key = `${operation}:${principalId}`
  try {
    const { data, error } = await client.rpc('check_rate_limit', {
      p_key: key,
      p_max_count: maxCount,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      // Fail open. The DB is the rate limiter of last resort; if its
      // RPC is broken, the route should still serve.
      console.error('rate-limit RPC error:', error)
      return { ok: true, error: error.message }
    }
    // RPC returns boolean directly.
    return { ok: data === true }
  } catch (err) {
    console.error('rate-limit exception:', err)
    return { ok: true, error: err.message }
  }
}
