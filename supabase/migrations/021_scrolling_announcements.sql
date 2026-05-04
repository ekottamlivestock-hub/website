-- ════════════════════════════════════════════════════
-- EKOTTAM — Scrolling announcements (homepage marquee)
-- Created: 2026-05-04
-- ════════════════════════════════════════════════════
--
-- Adds a single-table feature: a fixed, sitewide ticker bar that lives
-- right below the navbar and shows admin-curated announcements scrolling
-- horizontally. Each announcement carries a colored bullet (red / green
-- / blue) — the text colour stays uniform for readability.
--
-- Admin can add, delete, and pause/unpause items. Public users see only
-- active items via RLS. When zero items are active the front-end bar
-- hides entirely.
-- ════════════════════════════════════════════════════


-- 1. TABLE  ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrolling_announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT NOT NULL,
  color       TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Hard caps so a malformed admin form can't poison the marquee with a
  -- 10MB blob, and the colour is constrained to exactly the three the UI
  -- knows how to render.
  CONSTRAINT scrolling_text_length    CHECK (length(text) BETWEEN 1 AND 200),
  CONSTRAINT scrolling_colour_allowed CHECK (color IN ('red', 'green', 'blue'))
);

COMMENT ON TABLE scrolling_announcements IS
  'Admin-curated marquee items shown sitewide below the navbar. Each row
   carries a coloured bullet (red/green/blue) before its text.';


-- 2. INDEX  ────────────────────────────────────────────────────────────
-- The frontend query is essentially:
--   SELECT id, text, color FROM scrolling_announcements
--    WHERE is_active = TRUE
--    ORDER BY sort_order, created_at DESC;
-- so a covering composite is the right shape.
CREATE INDEX IF NOT EXISTS idx_scrolling_active_order
  ON scrolling_announcements (is_active, sort_order, created_at DESC);


-- 3. RLS  ──────────────────────────────────────────────────────────────
ALTER TABLE scrolling_announcements ENABLE ROW LEVEL SECURITY;

-- Public (incl. anonymous) can read only currently-active rows. Admin
-- can read everything (paused + active) for the management UI.
DROP POLICY IF EXISTS "Public reads active announcements" ON scrolling_announcements;
CREATE POLICY "Public reads active announcements"
  ON scrolling_announcements FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin reads all announcements" ON scrolling_announcements;
CREATE POLICY "Admin reads all announcements"
  ON scrolling_announcements FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Writes are admin-only with explicit WITH CHECK so post-update rows
-- still pass the admin gate (defence-in-depth pattern from the audit).
DROP POLICY IF EXISTS "Admin inserts announcements" ON scrolling_announcements;
CREATE POLICY "Admin inserts announcements"
  ON scrolling_announcements FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin updates announcements" ON scrolling_announcements;
CREATE POLICY "Admin updates announcements"
  ON scrolling_announcements FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin deletes announcements" ON scrolling_announcements;
CREATE POLICY "Admin deletes announcements"
  ON scrolling_announcements FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════════════════
-- DONE.
-- ════════════════════════════════════════════════════
