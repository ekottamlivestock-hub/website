-- ════════════════════════════════════════════════════
-- EKOTTAM — Critical Security Fixes
-- Created: 2026-04-17
-- Resolves: Self-purchase, view count bug, and
--           unapproved-seller listing creation
-- ════════════════════════════════════════════════════

-- 1. PREVENT SELF-PURCHASE
-- A seller should never be able to place an order on their own listing.
-- This is the database-level enforcement (in addition to the frontend guard).
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS chk_no_self_purchase;

ALTER TABLE orders
  ADD CONSTRAINT chk_no_self_purchase CHECK (buyer_id IS DISTINCT FROM seller_id);


-- 2. CREATE increment_view_count RPC FUNCTION
-- The listing detail page calls supabase.rpc('increment_view_count', ...),
-- but the function was never created. Without this, view counts never
-- update for non-admin users because the trg_protect_listing_tampering
-- trigger blocks direct UPDATE of view_count by non-admins.
-- Using SECURITY DEFINER allows this function to bypass that trigger check.
CREATE OR REPLACE FUNCTION increment_view_count(p_listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE listings
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION increment_view_count(UUID) IS
  'Atomically increments the view_count on a listing. Uses SECURITY DEFINER to bypass the anti-tampering trigger.';


-- 3. FIX: UNAPPROVED SELLERS CAN INSERT LISTINGS VIA RLS BYPASS
-- The old policy "Sellers can manage own listings" was FOR ALL and only
-- checked auth.uid() = seller_id. This meant ANY authenticated user could
-- insert a listing (since they set seller_id = their own id), regardless
-- of whether they were an approved seller. We now split into granular
-- per-operation policies where INSERT requires approved seller status.

-- Drop the old blanket policy
DROP POLICY IF EXISTS "Sellers can manage own listings" ON listings;

-- SELECT: Sellers can view all their own listings (any status)
CREATE POLICY "Sellers can view own listings"
  ON listings FOR SELECT
  USING (auth.uid() = seller_id);

-- INSERT: Only approved sellers (or admins) can create listings
CREATE POLICY "Approved sellers can create listings"
  ON listings FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR (role = 'seller' AND seller_status = 'approved')
      )
    )
  );

-- UPDATE: Sellers can update their own listings
CREATE POLICY "Sellers can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- DELETE: Sellers can delete their own listings (drafts only enforced in UI)
CREATE POLICY "Sellers can delete own listings"
  ON listings FOR DELETE
  USING (auth.uid() = seller_id);

