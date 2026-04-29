-- ════════════════════════════════════════════════════
-- EKOTTAM — Tighten notifications INSERT policy (S2-full)
-- Created: 2026-04-27
-- ════════════════════════════════════════════════════
--
-- BACKGROUND
-- ----------
-- Migration 003 added a policy:
--
--   CREATE POLICY "Authenticated users can insert notifications"
--     ON notifications FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated');
--
-- That let any logged-in user INSERT a notification with ANY user_id —
-- so any account could spam any other account's bell + page (and forge
-- admin-looking types like "seller_approved"). Migration 013 already
-- added type-whitelisting, actor-tracking, and a 30/hr rate limit, but
-- the underlying ability to forge a recipient was still there.
--
-- THE FULL FIX
-- ------------
-- Cross-user notifications now flow through the server route
-- /api/notify-internal which uses the service role (bypasses RLS) and
-- validates the (actor, recipient, type, metadata) tuple against the
-- real entity. The client can no longer insert with auth.uid() ≠
-- user_id — that path goes away.
--
-- Self-inserts remain allowed in case a future feature wants the
-- client to drop a personal todo into its own bell. Service role
-- inserts (from the API route) bypass RLS entirely.
-- ════════════════════════════════════════════════════


-- 1. Drop the wide policy.
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;


-- 2. Add a narrow self-insert policy. Anything cross-user has to go
--    through /api/notify-internal (service role).
DROP POLICY IF EXISTS "Self can insert own notifications" ON notifications;

CREATE POLICY "Self can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════
-- DONE.
-- After this, the only way for user A to drop a notification on user B
-- is the server-side /api/notify-internal route, which checks that A
-- is admin OR is a legitimate party in the relationship implied by
-- the notification type and metadata.
-- ════════════════════════════════════════════════════
