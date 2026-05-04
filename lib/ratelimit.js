// Postgres-backed rate limiting via the check_rate_limit RPC added in
// migration 016. Designed to be called from server-side route handlers
// holding an authenticated Supabase client (cookie session OR service
// role — both are fine, the function is SECURITY DEFINER).
//
// Keys are namespaced like "<operation>:<principal-id>" so different
// operations don't share counters (e.g. notify-internal:<uid> is
// independent of report-create:<uid>).
//
// FAIL-CLOSED POLICY
// ------------------
// On any RPC error or exception, this returns ok=false. The earlier
// version failed open, but the rate limit is the only throttle on
// abuse-prone endpoints (notify-internal, push, etc.) — fail-open turns
// any transient DB hiccup into a "no rate limit" window an attacker can
// trigger on demand. Erring closed is the safer default; a real outage
// will surface as 429s in monitoring rather than as silent DoS amplifier.

/**
 * @param {object}        client            - A supabase-js client (server or admin).
 * @param {string}        operation         - Short stable label for the operation.
 * @param {string|number} principalId       - The actor identifier (usually auth user id; fall back to IP for unauth flows).
 * @param {number}        maxCount          - Allowed actions per window.
 * @param {number}        windowSeconds     - Window length in seconds.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 *   ok=true if action is allowed; ok=false on rate-limit hit OR any
 *   underlying error (fail-closed). Caller can inspect `error` to
 *   distinguish "rate limited" from "service down".
 */
export async function checkRateLimit(client, operation, principalId, maxCount, windowSeconds) {
  if (!principalId) {
    // No principal to key on. Reject rather than silently allow — every
    // call site in this codebase has an authenticated principal, so
    // missing one indicates a caller bug we want to surface, not paper
    // over.
    return { ok: false, error: 'missing principal' }
  }
  const key = `${operation}:${principalId}`
  try {
    const { data, error } = await client.rpc('check_rate_limit', {
      p_key: key,
      p_max_count: maxCount,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      // Fail closed. Surface a 429-style block to the caller; an outage
      // of the rate-limit function should NOT translate into "no limit".
      console.error('rate-limit RPC error:', error.code || error.message)
      return { ok: false, error: 'rate-limit unavailable' }
    }
    return { ok: data === true }
  } catch (err) {
    console.error('rate-limit exception:', err?.message || err)
    return { ok: false, error: 'rate-limit unavailable' }
  }
}
