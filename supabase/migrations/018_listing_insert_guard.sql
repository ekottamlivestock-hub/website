-- ════════════════════════════════════════════════════
-- EKOTTAM — Block self-approval at listing INSERT time
-- Created: 2026-04-30
-- Resolves audit: sellers could POST a listing with
--                 status='approved' directly to the REST API
--                 and skip admin review.
-- ════════════════════════════════════════════════════
--
-- BACKGROUND
-- ----------
-- Migration 006 added trg_protect_listing_tampering as a BEFORE UPDATE
-- trigger. It clamps non-admin sellers to 'pending_review' if they try
-- to flip their own listing into 'approved' or 'rejected', and locks
-- view_count / created_at against tampering on UPDATE.
--
-- The blind spot is INSERT. The RLS policy "Approved sellers can create
-- listings" (mig 008) gates WHO can insert, but doesn't gate the row's
-- contents. An approved seller hitting /rest/v1/listings directly with
-- {seller_id: <self>, status: 'approved', view_count: 9999} would slip
-- through both the policy and the trigger — the listing would land
-- already-approved with a juiced view count.
--
-- THE FIX
-- -------
-- Replace the trigger so it fires on INSERT *and* UPDATE. On INSERT for
-- a non-admin caller:
--   * status must be 'draft' or 'pending_review'; anything else is
--     forced to 'pending_review' (admin must still approve before it
--     becomes public)
--   * view_count is forced to 0
--
-- On UPDATE the original behavior is preserved verbatim — sellers
-- can't promote their listing to 'approved'/'rejected' or rewrite
-- view_count / created_at.
--
-- Admins and service-role calls (auth.uid() is NULL) bypass entirely
-- so admin tooling and migrations keep working.
-- ════════════════════════════════════════════════════


CREATE OR REPLACE FUNCTION trg_protect_listing_tampering()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Service role / SQL editor / migrations have no auth.uid() — pass through.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Sellers may submit a draft or send for review. Any other value
    -- (especially 'approved') is forced to 'pending_review' so the
    -- admin review step cannot be skipped.
    IF NEW.status IS NULL OR NEW.status NOT IN ('draft', 'pending_review') THEN
      NEW.status := 'pending_review';
    END IF;
    -- View count must always start at zero; reject seller-supplied values.
    NEW.view_count := 0;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Sellers cannot independently approve or reject their own listings.
    IF NEW.status IN ('approved', 'rejected')
       AND OLD.status NOT IN ('approved', 'rejected') THEN
      NEW.status := 'pending_review';
    END IF;
    NEW.view_count := OLD.view_count;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Re-create the trigger to fire on both INSERT and UPDATE.
DROP TRIGGER IF EXISTS prevent_listing_tampering ON listings;
CREATE TRIGGER prevent_listing_tampering
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION trg_protect_listing_tampering();


-- ════════════════════════════════════════════════════
-- DONE.
-- After this migration, the only way for a non-admin to create a listing
-- in 'approved' status is to first send it for review and have an admin
-- promote it via the admin listings page.
-- ════════════════════════════════════════════════════
