-- ════════════════════════════════════════════════════
-- EKOTTAM — Auto-sync profile.seller_status on application
-- Created: 2026-04-30
-- Resolves audit M1 (silent failure of seller_status update).
-- ════════════════════════════════════════════════════
--
-- BACKGROUND
-- ----------
-- The /seller/apply page does:
--   1. INSERT INTO seller_applications (..., status='pending')   -- RLS: ✓
--   2. UPDATE profiles SET seller_status='pending', ...           -- silently dropped
--
-- Step 2 is silently neutralised by the trg_protect_profile_escalation
-- trigger from migration 006, which forces seller_status = OLD value
-- for any non-admin caller. So the application row is created, but the
-- profile.seller_status remains 'not_applied'. Any UI that reads
-- profiles.seller_status to decide between "Become a seller" / "Pending"
-- shows wrong state until an admin reviews.
--
-- THE FIX
-- -------
-- 1. Add an AFTER INSERT trigger on seller_applications that runs the
--    profile UPDATE itself, in SECURITY DEFINER. It only bumps users
--    who are in 'not_applied' or 'rejected' state — never downgrades
--    an already-approved or suspended seller (defensive guard against
--    the application table being mutated unexpectedly).
--
-- 2. Loosen trg_protect_profile_escalation to allow nested-trigger
--    writes through (pg_trigger_depth > 1). The new sync trigger does
--    a profile UPDATE which would otherwise re-trigger the escalation
--    guard and be blocked even though it's the system itself doing it.
--    Direct user updates (depth = 1) are still locked down — role and
--    seller_status remain immutable for non-admin self-edits via the
--    REST API.
-- ════════════════════════════════════════════════════


-- 1. SYNC TRIGGER ON seller_applications  ------------------------------
CREATE OR REPLACE FUNCTION trg_sync_profile_on_seller_app()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when the application is being recorded as pending. Admin
  -- approvals/rejections of the application also update profile state
  -- via the admin UI's own UPDATE flow, so we don't want to fight it
  -- here.
  IF NEW.status = 'pending' THEN
    UPDATE profiles
       SET seller_status       = 'pending',
           seller_requested_at = COALESCE(seller_requested_at, NOW())
     WHERE id = NEW.user_id
       -- Don't downgrade an active or suspended seller. A reapplication
       -- after rejection legitimately bumps them back to pending.
       AND seller_status IN ('not_applied', 'rejected');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_profile_on_seller_app ON seller_applications;
CREATE TRIGGER sync_profile_on_seller_app
  AFTER INSERT ON seller_applications
  FOR EACH ROW
  EXECUTE FUNCTION trg_sync_profile_on_seller_app();


-- 2. ALLOW NESTED-TRIGGER WRITES THROUGH THE ESCALATION GUARD  ---------
-- Replaces the function from migration 006. Direct user UPDATEs (depth
-- = 1) still get role / seller_status locked. Updates issued from
-- another trigger (depth > 1) — like the sync trigger above — are
-- trusted because the parent trigger has already authorised the change.
CREATE OR REPLACE FUNCTION trg_protect_profile_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Trusted nested call (e.g. seller-app sync) — let the change through.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    -- Force the sensitive columns to remain unchanged for non-admin
    -- self-updates. Direct REST API attempts to set role='admin' or
    -- seller_status='approved' silently revert.
    NEW.role          := OLD.role;
    NEW.seller_status := OLD.seller_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ════════════════════════════════════════════════════
-- DONE.
-- After this migration, submitting a seller application updates the
-- applicant's profile.seller_status to 'pending' atomically. Direct
-- non-admin attempts to bump role or seller_status via the REST API
-- are still blocked by the original guard.
-- ════════════════════════════════════════════════════
