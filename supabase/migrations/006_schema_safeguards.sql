-- ════════════════════════════════════════════════════
-- EKOTTAM — Schema Safeguards & Constraints
-- Created: 2026-04-12
-- Resolves Edge Cases, Logic Flaws, and Privilege Escalations
-- ════════════════════════════════════════════════════

-- 1. ADD CHECK CONSTRAINTS (Prevent Negative Numbers)
ALTER TABLE listings 
  DROP CONSTRAINT IF EXISTS chk_price_positive,
  DROP CONSTRAINT IF EXISTS chk_quantity_positive,
  DROP CONSTRAINT IF EXISTS chk_age_positive,
  DROP CONSTRAINT IF EXISTS chk_weight_positive;

ALTER TABLE listings 
  ADD CONSTRAINT chk_price_positive CHECK (price >= 0),
  ADD CONSTRAINT chk_quantity_positive CHECK (quantity >= 0),
  ADD CONSTRAINT chk_age_positive CHECK (age_value IS NULL OR age_value >= 0),
  ADD CONSTRAINT chk_weight_positive CHECK (weight_kg IS NULL OR weight_kg >= 0);

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS chk_order_quantity_positive,
  DROP CONSTRAINT IF EXISTS chk_order_total_price_positive;

ALTER TABLE orders
  ADD CONSTRAINT chk_order_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT chk_order_total_price_positive CHECK (total_price >= 0);

-- Reviews already has CHECK (rating BETWEEN 1 AND 5) in 001_complete_schema.sql.


-- 2. ADD UNIQUE CONSTRAINTS (Anti-Spam)
-- Prevent user from submitting multiple pending seller applications
DROP INDEX IF EXISTS idx_unique_pending_seller_app;

CREATE UNIQUE INDEX idx_unique_pending_seller_app 
ON seller_applications (user_id) 
WHERE status = 'pending';

-- Prevent multiple reviews per order
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS unique_review_per_order;

ALTER TABLE reviews
  ADD CONSTRAINT unique_review_per_order UNIQUE (order_id);


-- 3. TRIGGER: PREVENT PROFILE ESCALATION
-- Ensures normal users cannot escalate themselves to 'admin' or 'approved' seller.
CREATE OR REPLACE FUNCTION trg_protect_profile_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- We identify an API request from a standard user by checking if auth.uid() is active
  -- and they do not have the 'admin' role in the db.
  IF (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    -- Force the sensitive columns to remain unchanged
    NEW.role = OLD.role;
    NEW.seller_status = OLD.seller_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_profile_escalation ON profiles;
CREATE TRIGGER prevent_profile_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trg_protect_profile_escalation();


-- 4. TRIGGER: PREVENT LISTING SELF-APPROVAL
-- Sellers cannot change listing status to 'approved' or tamper with views
CREATE OR REPLACE FUNCTION trg_protect_listing_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    -- Sellers cannot independently approve or reject their own listings.
    IF NEW.status IN ('approved', 'rejected') AND OLD.status NOT IN ('approved', 'rejected') THEN
      NEW.status = 'pending_review'; -- Force to pending review
    END IF;

    -- Sellers cannot boost their own views magically
    NEW.view_count = OLD.view_count;
    NEW.created_at = OLD.created_at; -- Lock creation date
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_listing_tampering ON listings;
CREATE TRIGGER prevent_listing_tampering
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION trg_protect_listing_tampering();


-- 5. TRIGGER: ORDER INTEGRITY & CALCULATION
-- Ensures total_price is exact and listing is available
CREATE OR REPLACE FUNCTION trg_verify_order_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_listing_price NUMERIC;
  v_listing_status TEXT;
  v_listing_qty INT;
BEGIN
  -- Fetch the related listing's details
  SELECT price, status, quantity INTO v_listing_price, v_listing_status, v_listing_qty
  FROM listings
  WHERE id = NEW.listing_id;

  -- Verify listing exists and is approved (Only enforce strict checks on INSERT)
  IF TG_OP = 'INSERT' THEN
    IF v_listing_status != 'approved' THEN
      RAISE EXCEPTION 'Cannot purchase an unapproved or unavailable listing.';
    END IF;

    IF NEW.quantity > v_listing_qty THEN
      RAISE EXCEPTION 'Insufficient inventory. Only % available.', v_listing_qty;
    END IF;
  END IF;

  -- Strictly enforce the total price calculation
  NEW.total_price = NEW.quantity * v_listing_price;

  -- If it's an UPDATE by a non-admin, prevent changing core data
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
     NEW.buyer_id = OLD.buyer_id;
     NEW.seller_id = OLD.seller_id;
     NEW.listing_id = OLD.listing_id;
     NEW.quantity = OLD.quantity;
     NEW.total_price = OLD.total_price;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS verify_order_integrity ON orders;
CREATE TRIGGER verify_order_integrity
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_verify_order_integrity();


-- 6. TRIGGER: AUTO-DECREMENT INVENTORY ON ORDER
CREATE OR REPLACE FUNCTION trg_decrement_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement the quantity on the listing
  UPDATE listings 
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.listing_id;

  -- Mark as 'sold' if quantity drops to 0 or below (it shouldn't go below due to CHECK)
  UPDATE listings
  SET status = 'sold'
  WHERE id = NEW.listing_id AND quantity <= 0 AND status = 'approved';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decrement_inventory_on_order ON orders;
CREATE TRIGGER decrement_inventory_on_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_decrement_inventory();


-- 7. TRIGGER: REVIEW INTEGRITY
-- Ensures reviewee and reviewer match the order, and order is delivered.
CREATE OR REPLACE FUNCTION trg_verify_review_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_order_status TEXT;
  v_buyer_id UUID;
  v_seller_id UUID;
BEGIN
  SELECT status, buyer_id, seller_id INTO v_order_status, v_buyer_id, v_seller_id
  FROM orders
  WHERE id = NEW.order_id;

  IF v_order_status != 'delivered' THEN
    RAISE EXCEPTION 'Reviews can only be submitted for delivered orders.';
  END IF;

  -- Force correct assignments regardless of what API payload sent
  NEW.reviewer_id = v_buyer_id;
  NEW.reviewee_id = v_seller_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS verify_review_integrity ON reviews;
CREATE TRIGGER verify_review_integrity
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trg_verify_review_integrity();

-- ════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════
