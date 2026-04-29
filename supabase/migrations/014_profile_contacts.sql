-- ════════════════════════════════════════════════════
-- EKOTTAM — Move phone off profiles into profile_contacts
-- Created: 2026-04-27
-- Resolves audit S1 (phone leak via wide-open profiles SELECT)
-- ════════════════════════════════════════════════════
--
-- THE PROBLEM
-- -----------
-- profiles has a wide-open SELECT policy ("Users can view all profiles"
-- USING TRUE) so the listing pages can show seller name/avatar/city to
-- anyone — including anonymous visitors. That same policy also leaked
-- the `phone` column. With just the public anon key, anyone could:
--   curl  ".../rest/v1/profiles?select=phone"
-- and walk off with every user's phone number. Under India's DPDP Act
-- 2023 phone is personal data — this is a regulatory exposure, not just
-- a security one.
--
-- THE FIX
-- -------
-- Move phone to its own table `profile_contacts` with strict RLS:
--   * Self can read/write their own contact
--   * Admin can read/manage all contacts
--   * Order counterparties (buyer ↔ seller of an active order) can
--     read each other's phone — needed once an order is placed so
--     the parties can coordinate delivery.
--
-- After this, the `profiles` table no longer holds PII so the existing
-- wide SELECT policy stays — name, avatar, city, state are
-- intentionally public for marketplace browsing.
-- ════════════════════════════════════════════════════


-- 1. NEW TABLE  ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_contacts (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  phone      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profile_contacts IS
  'Sensitive contact info split off from profiles. RLS-restricted to '
  'self / admin / active-order counterparty.';

-- Keep updated_at fresh on row updates.
DROP TRIGGER IF EXISTS trg_profile_contacts_updated_at ON profile_contacts;
CREATE TRIGGER trg_profile_contacts_updated_at
  BEFORE UPDATE ON profile_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 2. BACKFILL FROM profiles.phone  --------------------------------------
-- Idempotent: ON CONFLICT DO NOTHING means re-running this migration is
-- safe (e.g. on a fresh restore where 014 was already applied).
INSERT INTO profile_contacts (user_id, phone)
SELECT id, phone
  FROM profiles
 WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;


-- 3. DROP THE LEAKY COLUMN  ---------------------------------------------
-- After this, anyone sniffing /rest/v1/profiles cannot retrieve phone.
ALTER TABLE profiles DROP COLUMN IF EXISTS phone;


-- 4. RLS ON profile_contacts  -------------------------------------------
ALTER TABLE profile_contacts ENABLE ROW LEVEL SECURITY;

-- Self
DROP POLICY IF EXISTS "Self reads own contact"   ON profile_contacts;
DROP POLICY IF EXISTS "Self inserts own contact" ON profile_contacts;
DROP POLICY IF EXISTS "Self updates own contact" ON profile_contacts;

CREATE POLICY "Self reads own contact"
  ON profile_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Self inserts own contact"
  ON profile_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Self updates own contact"
  ON profile_contacts FOR UPDATE
  USING       (auth.uid() = user_id)
  WITH CHECK  (auth.uid() = user_id);

-- Admin — full management
DROP POLICY IF EXISTS "Admin manages all contacts" ON profile_contacts;

CREATE POLICY "Admin manages all contacts"
  ON profile_contacts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Order counterparties — buyer and seller of an active (non-cancelled)
-- order can read each other's phone. Lets them coordinate delivery
-- without ekottam having to relay every message.
DROP POLICY IF EXISTS "Order counterparties read contact" ON profile_contacts;

CREATE POLICY "Order counterparties read contact"
  ON profile_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
       WHERE o.status <> 'cancelled'
         AND (
           (o.buyer_id  = auth.uid() AND o.seller_id = profile_contacts.user_id)
           OR
           (o.seller_id = auth.uid() AND o.buyer_id  = profile_contacts.user_id)
         )
    )
  );


-- ════════════════════════════════════════════════════
-- DONE.
-- After this migration, the only places `phone` is reachable are:
--   * the user themselves (via profile_contacts where user_id = auth.uid())
--   * an admin
--   * the counterparty on an active order
-- ════════════════════════════════════════════════════
