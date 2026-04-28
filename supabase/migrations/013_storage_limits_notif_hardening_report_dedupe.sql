-- ════════════════════════════════════════════════════
-- EKOTTAM — Storage limits, notification hardening, report dedupe
-- Created: 2026-04-27
-- Resolves: L3 (bucket size/MIME limits), partial S2 (notification
--           type whitelist + actor tracking + per-actor rate limit),
--           and a new unique-open-report constraint.
-- ════════════════════════════════════════════════════


-- 1. STORAGE BUCKET LIMITS (L3) ----------------------------------------
-- Today the only file-type / size protection is in the React component.
-- Anyone hitting the storage REST API directly (bypassing our uploader)
-- can post 50 MB executables labelled .jpg. Lock this down at the bucket
-- level so even a malicious direct request gets rejected by the
-- platform before our policies even see it.

UPDATE storage.buckets
   SET file_size_limit    = 5 * 1024 * 1024,  -- 5 MB
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'listing-media';

UPDATE storage.buckets
   SET file_size_limit    = 5 * 1024 * 1024,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'avatars';

UPDATE storage.buckets
   SET file_size_limit    = 5 * 1024 * 1024,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']
 WHERE id = 'seller-docs';


-- 2. UNIQUE OPEN REPORT TUPLE  -----------------------------------------
-- Today a single user can file unlimited reports against the same
-- listing — easy abuse vector against a competitor. One open report
-- per (reporter, listing) is plenty; resolved/dismissed reports don't
-- block a new one if the user later spots a different problem.

DROP INDEX IF EXISTS idx_unique_open_report;

CREATE UNIQUE INDEX idx_unique_open_report
  ON reports (reporter_id, listing_id)
  WHERE status = 'open';


-- 3. NOTIFICATIONS — ACTOR TRACKING + TYPE WHITELIST + RATE LIMIT  -----
-- The current INSERT policy (`auth.role() = 'authenticated'`) lets any
-- logged-in user inject any notification for any user_id. We can't yet
-- move all `sendNotification` calls to a server-side route in this
-- batch, but we can:
--   a) record WHO sent each notification so abuse is traceable
--   b) restrict the `type` column to known values so an attacker can't
--      forge an arbitrary string the UI may render specially
--   c) cap how many notifications a single non-admin actor can fire at
--      a single recipient per hour

-- a) actor tracking column + auto-fill trigger
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON notifications(from_user_id);

CREATE OR REPLACE FUNCTION trg_set_notification_actor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.from_user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.from_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_notification_actor ON notifications;
CREATE TRIGGER set_notification_actor
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_notification_actor();


-- b) type whitelist — every type the app actually emits today
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    -- order lifecycle
    'new_order', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled',
    -- listing lifecycle
    'listing_approved', 'listing_rejected', 'listing_paused', 'listing_unpaused',
    'new_listing_pending',
    -- seller lifecycle
    'new_seller_application',
    'seller_approved', 'seller_rejected',
    'seller_suspended', 'seller_reactivated', 'seller_removed'
  ));


-- c) per-actor-per-recipient rate limit (admins exempt)
CREATE OR REPLACE FUNCTION trg_check_notification_ratelimit()
RETURNS TRIGGER AS $$
DECLARE
  v_count    INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Server-side / system-emitted notifs (no actor) are always allowed.
  IF NEW.from_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins bypass — bulk approvals legitimately fan out many notifs.
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.from_user_id AND role = 'admin'
  ) INTO v_is_admin;
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM notifications
   WHERE from_user_id = NEW.from_user_id
     AND user_id      = NEW.user_id
     AND created_at  > NOW() - INTERVAL '1 hour';

  IF v_count >= 30 THEN
    RAISE EXCEPTION 'Notification rate limit exceeded (max 30/hour per recipient).';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_notification_ratelimit ON notifications;
CREATE TRIGGER check_notification_ratelimit
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trg_check_notification_ratelimit();


-- ════════════════════════════════════════════════════
-- DONE — three independent hardenings in one migration.
-- ════════════════════════════════════════════════════
