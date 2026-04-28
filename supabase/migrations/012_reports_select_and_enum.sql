-- ════════════════════════════════════════════════════
-- EKOTTAM — Reports table fixes (P2 #8, P3 #16)
-- Created: 2026-04-27
-- ════════════════════════════════════════════════════
--
-- 1. Reporter can read own reports (P2 #8)
-- ----------------------------------------
-- Today reports has only INSERT (reporter) and FOR ALL (admin) policies —
-- no SELECT for the reporter, so a user can submit but can't ever see
-- their own submission. Harmless today (no UI lists them) but a trap
-- for anyone adding a "My Reports" view later.
--
-- 2. CHECK constraint on reason (P3 #16)
-- --------------------------------------
-- The UI in app/listings/[id]/page.js sends one of:
--   fake_listing | wrong_price | inappropriate | fraud | other
-- but the DB column is free-form TEXT. Lock it down so admin filters /
-- analytics dashboards can rely on the values.
-- ════════════════════════════════════════════════════


-- 1. SELECT POLICY — reporter sees own reports
DROP POLICY IF EXISTS "Reporters see own reports" ON reports;

CREATE POLICY "Reporters see own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);


-- 2. CHECK CONSTRAINT — reason enum
-- Defensively normalize any legacy free-form values to 'other' before
-- adding the constraint, so existing rows aren't rejected.
UPDATE reports
   SET reason = 'other'
 WHERE reason NOT IN ('fake_listing', 'wrong_price', 'inappropriate', 'fraud', 'other');

ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_reason_check;

ALTER TABLE reports
  ADD CONSTRAINT reports_reason_check
  CHECK (reason IN ('fake_listing', 'wrong_price', 'inappropriate', 'fraud', 'other'));


-- ════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════
