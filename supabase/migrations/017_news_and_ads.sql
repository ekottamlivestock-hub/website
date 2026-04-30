-- ════════════════════════════════════════════════════
-- EKOTTAM — Home page News + Ads (admin-managed)
-- Created: 2026-04-30
-- ════════════════════════════════════════════════════
--
-- What this migration adds
-- ------------------------
-- 1. `news_posts`            — admin-authored news entries shown on
--                              the home page rail and a public /news page.
-- 2. `news_post_media`       — many photos per post (horizontal scroll
--                              inside each card and detail page).
-- 3. `home_ads`              — admin-uploaded images shown as a
--                              non-clickable rail under the news section.
-- 4. Storage buckets         — `news-media` and `ad-media` (both public
--                              read, admin-only write).
-- 5. RLS policies            — anyone can read published news / active
--                              ads; only admins can write.
-- ════════════════════════════════════════════════════


-- 1. NEWS POSTS  --------------------------------------------------------
CREATE TABLE IF NOT EXISTS news_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  news_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  news_posts            IS 'Admin-authored news shown on the home page and /news.';
COMMENT ON COLUMN news_posts.news_date  IS 'Date displayed on the card / detail page (admin picks).';

CREATE INDEX IF NOT EXISTS idx_news_posts_published_date
  ON news_posts (is_published, news_date DESC, created_at DESC);


-- 2. NEWS POST MEDIA  --------------------------------------------------
CREATE TABLE IF NOT EXISTS news_post_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_post_id    UUID NOT NULL REFERENCES news_posts(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_post_media_post
  ON news_post_media (news_post_id, sort_order);


-- 3. HOME ADS  ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS home_ads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url    TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE home_ads IS 'Promotional images shown on home page (non-clickable, admin-managed).';

CREATE INDEX IF NOT EXISTS idx_home_ads_active_order
  ON home_ads (is_active, sort_order, created_at DESC);


-- 4. UPDATED_AT TRIGGERS  ----------------------------------------------
CREATE OR REPLACE FUNCTION trg_news_ads_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS news_posts_set_updated_at ON news_posts;
CREATE TRIGGER news_posts_set_updated_at
  BEFORE UPDATE ON news_posts
  FOR EACH ROW EXECUTE FUNCTION trg_news_ads_set_updated_at();

DROP TRIGGER IF EXISTS home_ads_set_updated_at ON home_ads;
CREATE TRIGGER home_ads_set_updated_at
  BEFORE UPDATE ON home_ads
  FOR EACH ROW EXECUTE FUNCTION trg_news_ads_set_updated_at();


-- 5. RLS — TABLES  -----------------------------------------------------
ALTER TABLE news_posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_post_media   ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_ads          ENABLE ROW LEVEL SECURITY;

-- news_posts: public reads only published rows; admins do everything
DROP POLICY IF EXISTS "Anyone reads published news"     ON news_posts;
DROP POLICY IF EXISTS "Admin manages all news"          ON news_posts;

CREATE POLICY "Anyone reads published news"
  ON news_posts FOR SELECT
  USING (is_published = TRUE
         OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manages all news"
  ON news_posts FOR ALL
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- news_post_media: public reads if parent published; admins manage
DROP POLICY IF EXISTS "Anyone reads media of published news" ON news_post_media;
DROP POLICY IF EXISTS "Admin manages all news media"         ON news_post_media;

CREATE POLICY "Anyone reads media of published news"
  ON news_post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM news_posts p
       WHERE p.id = news_post_media.news_post_id
         AND (p.is_published = TRUE
              OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Admin manages all news media"
  ON news_post_media FOR ALL
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- home_ads: public reads only active rows; admins do everything
DROP POLICY IF EXISTS "Anyone reads active ads" ON home_ads;
DROP POLICY IF EXISTS "Admin manages all ads"   ON home_ads;

CREATE POLICY "Anyone reads active ads"
  ON home_ads FOR SELECT
  USING (is_active = TRUE
         OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manages all ads"
  ON home_ads FOR ALL
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- 6. STORAGE BUCKETS  --------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-media', 'news-media', TRUE,
  5 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-media', 'ad-media', TRUE,
  5 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- 7. STORAGE POLICIES — NEWS-MEDIA (public read, admin write)  ---------
DROP POLICY IF EXISTS "Anyone can view news media"    ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload news media"   ON storage.objects;
DROP POLICY IF EXISTS "Admin can update news media"   ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete news media"   ON storage.objects;

CREATE POLICY "Anyone can view news media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'news-media');

CREATE POLICY "Admin can upload news media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'news-media'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update news media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'news-media'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete news media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'news-media'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 8. STORAGE POLICIES — AD-MEDIA (public read, admin write)  -----------
DROP POLICY IF EXISTS "Anyone can view ad media"   ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload ad media"  ON storage.objects;
DROP POLICY IF EXISTS "Admin can update ad media"  ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete ad media"  ON storage.objects;

CREATE POLICY "Anyone can view ad media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-media');

CREATE POLICY "Admin can upload ad media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ad-media'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update ad media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'ad-media'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete ad media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ad-media'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════════════════
-- DONE.
-- ════════════════════════════════════════════════════
