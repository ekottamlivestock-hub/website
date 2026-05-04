-- ════════════════════════════════════════════════════
-- EKOTTAM — Critical security fixes (audit C1–C3)
-- Created: 2026-05-03
-- ════════════════════════════════════════════════════
--
-- This migration closes three critical issues found in the full-codebase
-- audit. Each section is independently re-runnable.
--
--   1. Buyer-side order field spoofing on INSERT
--      The order-integrity trigger from migration 011 already recomputes
--      total_price server-side, but it does NOT clamp seller_id, status,
--      or payment_status on INSERT. A buyer hitting /rest/v1/orders can
--      submit { status: 'confirmed', payment_status: 'paid', seller_id:
--      <attacker-id> } and the row lands in that state. We extend the
--      INSERT branch of the integrity trigger to coerce these to safe,
--      server-derived values regardless of what the client sent.
--
--   2. Seller self-approval via UPDATE / pause-toggle (audit C2 & C3)
--      Migration 018 closed self-approval at INSERT, but the UPDATE
--      branch only blocks the specific transition (X→approved/rejected
--      where OLD ∉ {approved,rejected}). A seller with a 'rejected'
--      listing can submit an UPDATE that sets status='approved' and slip
--      through. Worse, the same logic ALSO clamps the legitimate
--      'paused → approved' resume transition to 'pending_review',
--      silently breaking the pause/resume UI. We replace the transition
--      check with an explicit allow-list. Anything not on the list is
--      silently reverted to OLD.status.
--
--   3. Review forgery via spoofed reviewer_id (audit C1)
--      The original "Reviewer can write review" policy only checks
--      auth.uid() = reviewer_id (the value the client sent). The trigger
--      from migration 006 then overwrites reviewer_id := buyer_id from
--      the order. So if an attacker INSERTs with reviewer_id = self but
--      order_id pointing at someone else's delivered order, the trigger
--      replaces reviewer_id with the real buyer's uid AFTER the policy
--      already passed — minting a forged review under the real buyer's
--      name. We tighten the policy to JOIN to orders and verify that
--      auth.uid() actually IS the buyer of that order and that the order
--      is delivered.
-- ════════════════════════════════════════════════════


-- 1. ORDER INTEGRITY — clamp identity + state on INSERT  ──────────────────
CREATE OR REPLACE FUNCTION trg_verify_order_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_listing_seller UUID;
  v_listing_price  NUMERIC;
  v_listing_status TEXT;
  v_listing_qty    INT;
  v_is_admin       BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Row-lock the listing for the duration of the transaction. Concurrent
    -- buyers serialize on this row, so the inventory check below is exact.
    SELECT seller_id, price, status, quantity
      INTO v_listing_seller, v_listing_price, v_listing_status, v_listing_qty
      FROM listings
     WHERE id = NEW.listing_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Listing not found.';
    END IF;

    IF v_listing_status <> 'approved' THEN
      RAISE EXCEPTION 'Cannot purchase an unapproved or unavailable listing.';
    END IF;

    IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
      RAISE EXCEPTION 'Quantity must be at least 1.';
    END IF;

    IF NEW.quantity > v_listing_qty THEN
      RAISE EXCEPTION 'Insufficient inventory. Only % available.', v_listing_qty;
    END IF;

    -- Server-authoritative fields. Whatever the client sent is overwritten:
    --   seller_id      → derived from the listing (no spoofing)
    --   total_price    → recomputed (no price tampering)
    --   status         → forced to 'pending' (no self-confirm)
    --   payment_status → forced to 'unpaid'  (no self-mark-paid)
    NEW.seller_id      := v_listing_seller;
    NEW.total_price    := NEW.quantity * v_listing_price;
    NEW.status         := 'pending';
    NEW.payment_status := 'unpaid';

    -- Atomic decrement under the row lock. If we hit zero, mark sold so
    -- the listing disappears from public view immediately. The nested
    -- UPDATE re-fires trg_protect_listing_tampering at depth>1, which is
    -- bypassed by the depth guard added in section 2 below.
    UPDATE listings
       SET quantity = quantity - NEW.quantity,
           status   = CASE
                        WHEN quantity - NEW.quantity <= 0 THEN 'sold'
                        ELSE status
                      END
     WHERE id = NEW.listing_id;

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) INTO v_is_admin;

    IF auth.uid() IS NOT NULL AND NOT v_is_admin THEN
      NEW.buyer_id    := OLD.buyer_id;
      NEW.seller_id   := OLD.seller_id;
      NEW.listing_id  := OLD.listing_id;
      NEW.quantity    := OLD.quantity;
      NEW.total_price := OLD.total_price;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS verify_order_integrity ON orders;
CREATE TRIGGER verify_order_integrity
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_verify_order_integrity();


-- 2. LISTING TRANSITION ALLOW-LIST  ────────────────────────────────────────
-- Replaces the function from migration 018. Same INSERT behavior; the
-- UPDATE branch is rewritten as an explicit allow-list of seller-initiated
-- transitions. Anything off the list (including the rejected→approved
-- bypass) silently reverts to OLD.status.
CREATE OR REPLACE FUNCTION trg_protect_listing_tampering()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_allowed  BOOLEAN;
BEGIN
  -- Service role / SQL editor / migrations have no auth.uid() — pass through.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Trusted nested write (e.g. trg_verify_order_integrity flipping a sold-
  -- out listing to 'sold', or trg_restore_inventory_on_cancel reopening a
  -- cancelled order's listing). The parent trigger has already authorised
  -- the change, so we don't second-guess it here.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL OR NEW.status NOT IN ('draft', 'pending_review') THEN
      NEW.status := 'pending_review';
    END IF;
    NEW.view_count := 0;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Audit-locked columns. Sellers cannot rewrite history.
    NEW.view_count := OLD.view_count;
    NEW.created_at := OLD.created_at;

    -- Allowed seller-initiated status transitions:
    --   draft         → draft, pending_review
    --   pending_review→ draft, pending_review
    --   rejected      → draft, pending_review        (resubmit after fixes)
    --   approved      ↔ paused                       (live listing toggle)
    --   sold          → sold                         (terminal)
    --   any           → same                         (no change)
    -- The 'sold' state is reached only via the order trigger's nested
    -- UPDATE, which is already exempted by the depth>1 guard above.
    v_allowed :=
         OLD.status = NEW.status
      OR (OLD.status IN ('draft', 'pending_review', 'rejected')
          AND NEW.status IN ('draft', 'pending_review'))
      OR (OLD.status = 'approved' AND NEW.status = 'paused')
      OR (OLD.status = 'paused'   AND NEW.status = 'approved');

    IF NOT v_allowed THEN
      NEW.status := OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_listing_tampering ON listings;
CREATE TRIGGER prevent_listing_tampering
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION trg_protect_listing_tampering();


-- 3. REVIEWS — bind INSERT to a delivered order the caller actually owns ──
-- Replaces the policy from migration 001. The new policy refuses any
-- review where the caller is not the buyer of the referenced order, or
-- the order is not in 'delivered' status, or the reviewee_id does not
-- match the order's seller. This closes the forgery vector where an
-- attacker could spoof reviewer_id = self with order_id = victim's
-- delivered order, and have the trigger overwrite reviewer_id back to
-- the victim's uid.
DROP POLICY IF EXISTS "Reviewer can write review" ON reviews;

CREATE POLICY "Buyer can review own delivered order"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1
        FROM orders
       WHERE orders.id        = reviews.order_id
         AND orders.buyer_id  = auth.uid()
         AND orders.seller_id = reviews.reviewee_id
         AND orders.status    = 'delivered'
    )
  );


-- ════════════════════════════════════════════════════
-- DONE.
-- After this migration:
--   • Order INSERTs are server-authoritative for seller_id, total_price,
--     status, and payment_status. A buyer cannot self-confirm or skip
--     payment.
--   • Sellers can only move listings between (draft, pending_review),
--     re-submit a rejected listing, or toggle approved↔paused. The
--     rejected→approved bypass is closed; the approved→paused→approved
--     resume cycle works again.
--   • Reviews can only be inserted by the actual buyer of a delivered
--     order, against that order's actual seller. Forgery via spoofed
--     reviewer_id is blocked at the policy layer regardless of the
--     reviewer-id-overwrite trigger.
-- ════════════════════════════════════════════════════
