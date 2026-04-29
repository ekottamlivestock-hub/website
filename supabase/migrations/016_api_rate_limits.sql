-- ════════════════════════════════════════════════════
-- EKOTTAM — HTTP + write-rate limiting (S6)
-- Created: 2026-04-27
-- ════════════════════════════════════════════════════
--
-- Why Postgres-backed and not Upstash / Vercel KV?
-- ------------------------------------------------
-- The app already pays the round-trip to Postgres on every API call.
-- Postgres handles atomic UPSERT under contention via row-locks, which
-- is exactly what a fixed-window counter needs. Avoiding a second
-- external service (Upstash credentials, network hop, billing) keeps
-- the deploy story simple.
--
-- What this migration adds
-- ------------------------
-- 1. Table `api_rate_limits` (key, count, window_started_at) — one
--    row per (operation, principal) combo.
-- 2. Function `check_rate_limit(key, max_count, window_seconds)` that
--    atomically increments and tells the caller whether the action
--    is allowed. SECURITY DEFINER so the API route can call it with
--    just an authenticated session — no service role required.
-- 3. Trigger on orders that limits a single non-admin buyer to 10
--    new orders per rolling hour. Stops the "place 1000 pending
--    orders to lock seller inventory" abuse vector — even though
--    the over-sell race is already covered by row-locking in mig 011,
--    inventory is reserved by pending orders until the seller
--    rejects them, and a hostile buyer could drain availability.
-- ════════════════════════════════════════════════════


-- 1. RATE-LIMIT TABLE  --------------------------------------------------
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key                TEXT PRIMARY KEY,
  count              INTEGER NOT NULL DEFAULT 0,
  window_started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE api_rate_limits IS
  'Fixed-window rate-limit counters keyed by ":". '
  'Accessed only via the SECURITY DEFINER check_rate_limit() function.';

-- Lock the table down — only the SECURITY DEFINER function and
-- service-role / postgres can touch it. RLS with no policies = deny.
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;


-- 2. CHECK_RATE_LIMIT FUNCTION  ----------------------------------------
-- Returns TRUE if the caller's action is within the limit (and the
-- counter is incremented), FALSE if exceeded. The window resets
-- automatically once the original `window_started_at` is older than
-- `p_window_seconds`.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key             TEXT,
  p_max_count       INTEGER,
  p_window_seconds  INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO api_rate_limits AS rl (key, count, window_started_at, updated_at)
  VALUES (p_key, 1, NOW(), NOW())
  ON CONFLICT (key) DO UPDATE
    SET
      count = CASE
                WHEN rl.window_started_at < NOW() - (p_window_seconds || ' seconds')::INTERVAL
                  THEN 1
                ELSE rl.count + 1
              END,
      window_started_at = CASE
                            WHEN rl.window_started_at < NOW() - (p_window_seconds || ' seconds')::INTERVAL
                              THEN NOW()
                            ELSE rl.window_started_at
                          END,
      updated_at = NOW()
  RETURNING count INTO v_count;

  RETURN v_count <= p_max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated, service_role;

COMMENT ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) IS
  'Atomic fixed-window counter. Increments and returns whether the '
  'caller is still within p_max_count for the window. Caller picks '
  'a key like "notify-internal:" so different operations '
  'don''t share counters.';


-- 3. ORDER-PLACEMENT RATE LIMIT  ---------------------------------------
-- A non-admin buyer placing more than 10 orders in a rolling hour is
-- almost certainly automated abuse. Admins are exempt.
CREATE OR REPLACE FUNCTION trg_check_order_ratelimit()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INTEGER;
  v_is_admin     BOOLEAN;
BEGIN
  -- Service role / system inserts (no auth.uid()) bypass.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_recent_count
    FROM orders
   WHERE buyer_id   = NEW.buyer_id
     AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= 10 THEN
    RAISE EXCEPTION
      'Order rate limit exceeded (max 10 per hour). Please wait before placing more orders.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_order_ratelimit ON orders;
CREATE TRIGGER check_order_ratelimit
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_check_order_ratelimit();


-- ════════════════════════════════════════════════════
-- DONE.
-- ════════════════════════════════════════════════════
