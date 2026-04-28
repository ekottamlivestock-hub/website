-- ════════════════════════════════════════════════════
-- EKOTTAM — Order concurrency & buyer cancellations
-- Created: 2026-04-27
-- Resolves P1 #4 (no buyer cancel) and P1 #5 (over-sell race)
-- ════════════════════════════════════════════════════
--
-- BUGS BEING FIXED
-- ----------------
-- 1. OVER-SELL RACE: trg_verify_order_integrity (BEFORE INSERT) read the
--    listing's quantity without a row lock; trg_decrement_inventory (AFTER
--    INSERT) decremented separately. Two concurrent buyers could each pass
--    the BEFORE check and both succeed, dropping inventory below zero.
--
-- 2. NO BUYER CANCEL: orders had only "Sellers can update their orders" and
--    "Admin can manage all orders" UPDATE policies. Buyers had no way to
--    cancel a pending order. Plus there was no symmetric trigger to restore
--    listing.quantity when an order is cancelled — cancellations leaked
--    inventory.
--
-- FIX
-- ----
-- 1. Rewrite trg_verify_order_integrity to take a SELECT ... FOR UPDATE
--    lock on the listing row, validate state, set total_price, and
--    decrement quantity atomically — all inside the BEFORE INSERT trigger.
--    Drop the now-redundant AFTER INSERT decrement trigger.
-- 2. Add an RLS policy letting buyers update their own pending orders to
--    'cancelled' (and only that transition).
-- 3. Add an AFTER UPDATE trigger that restores listing.quantity when an
--    order moves to 'cancelled', and re-opens a 'sold' listing back to
--    'approved' if its inventory is positive again.
-- ════════════════════════════════════════════════════


-- 1. ATOMIC ORDER INTEGRITY + DECREMENT  --------------------------------
CREATE OR REPLACE FUNCTION trg_verify_order_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_listing_price  NUMERIC;
  v_listing_status TEXT;
  v_listing_qty    INT;
  v_is_admin       BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Row-lock the listing for the duration of the transaction. Concurrent
    -- buyers serialize on this row, so the inventory check below is exact.
    SELECT price, status, quantity
      INTO v_listing_price, v_listing_status, v_listing_qty
      FROM listings
     WHERE id = NEW.listing_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Listing not found.';
    END IF;

    IF v_listing_status <> 'approved' THEN
      RAISE EXCEPTION 'Cannot purchase an unapproved or unavailable listing.';
    END IF;

    IF NEW.quantity > v_listing_qty THEN
      RAISE EXCEPTION 'Insufficient inventory. Only % available.', v_listing_qty;
    END IF;

    -- Total price is server-authoritative.
    NEW.total_price := NEW.quantity * v_listing_price;

    -- Atomic decrement under the row lock. If we hit zero, mark sold so the
    -- listing disappears from public view immediately.
    UPDATE listings
       SET quantity = quantity - NEW.quantity,
           status   = CASE
                        WHEN quantity - NEW.quantity <= 0 THEN 'sold'
                        ELSE status
                      END
     WHERE id = NEW.listing_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Non-admin UPDATEs may only mutate status / payment / delivery fields.
    -- Buyer / seller / listing / quantity / total_price are immutable.
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

-- The BEFORE INSERT trigger already exists from migration 006; the function
-- swap above is enough. Re-create defensively in case it was dropped.
DROP TRIGGER IF EXISTS verify_order_integrity ON orders;
CREATE TRIGGER verify_order_integrity
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_verify_order_integrity();


-- 2. DROP THE OLD AFTER-INSERT DECREMENT TRIGGER  -----------------------
-- Decrement is now done atomically inside the BEFORE INSERT integrity
-- trigger, so this is redundant (and double-decrements if left in place).
DROP TRIGGER IF EXISTS decrement_inventory_on_order ON orders;
DROP FUNCTION IF EXISTS trg_decrement_inventory();


-- 3. BUYER CANCEL — RLS POLICY  -----------------------------------------
DROP POLICY IF EXISTS "Buyers can cancel own pending orders" ON orders;

CREATE POLICY "Buyers can cancel own pending orders"
  ON orders FOR UPDATE
  USING (auth.uid() = buyer_id AND status = 'pending')
  WITH CHECK (auth.uid() = buyer_id AND status IN ('pending', 'cancelled'));


-- 4. INVENTORY RESTORE ON CANCEL  ---------------------------------------
CREATE OR REPLACE FUNCTION trg_restore_inventory_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE listings
       SET quantity = quantity + OLD.quantity,
           -- If the listing was auto-marked 'sold' when inventory hit zero,
           -- bringing stock back means it's available again.
           status   = CASE
                        WHEN status = 'sold' AND quantity + OLD.quantity > 0
                          THEN 'approved'
                        ELSE status
                      END
     WHERE id = OLD.listing_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS restore_inventory_on_cancel ON orders;
CREATE TRIGGER restore_inventory_on_cancel
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_restore_inventory_on_cancel();


-- ════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════
