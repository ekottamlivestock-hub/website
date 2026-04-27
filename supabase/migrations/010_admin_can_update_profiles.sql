-- ════════════════════════════════════════════════════
-- EKOTTAM — Admin can update profiles
-- Created: 2026-04-27
-- Resolves: Seller approval silently does nothing
-- ════════════════════════════════════════════════════
--
-- ROOT CAUSE
-- ----------
-- The only UPDATE policy on `profiles` was:
--   "Users can update own profile" USING (auth.uid() = id)
--
-- When an admin approves a seller application from app/admin/sellers/page.js,
-- the browser runs:
--   UPDATE profiles SET role='seller', seller_status='approved' WHERE id = <applicant>
-- Because auth.uid() (admin) ≠ id (applicant), RLS silently rejects the row.
-- supabase-js returns {data: [], error: null}, the admin sees a success toast,
-- but the applicant's profile is unchanged. The Navbar continues to show
-- "Become a Seller" / "Application Pending" because role/seller_status
-- never moved.
--
-- FIX
-- ----
-- 1. Add an explicit admin UPDATE policy on `profiles` so admin can flip
--    role / seller_status on any user (the existing
--    `prevent_profile_escalation` BEFORE-UPDATE trigger already lets admins
--    through, so no other guard needs to change).
-- 2. The seller_status CHECK constraint must allow 'suspended' — the admin UI
--    (handleSuspend) writes that value but the original constraint omitted it,
--    so suspend would fail with a check_violation once the RLS hole above is
--    closed.
-- ════════════════════════════════════════════════════


-- 1. ADMIN UPDATE POLICY ON PROFILES
-- Idempotent: drop-if-exists, then create.
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;

CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 2. ALLOW 'suspended' IN seller_status
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_seller_status_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_seller_status_check
  CHECK (seller_status IN ('not_applied', 'pending', 'approved', 'rejected', 'suspended'));


-- ════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════
