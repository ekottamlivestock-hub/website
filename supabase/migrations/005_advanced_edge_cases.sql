-- ════════════════════════════════════════════════════
-- EKOTTAM — Advanced Edge Cases & Constrains
-- Created: 2026-04-12
-- Resolves Storage Leakage and Deletion Traps
-- ════════════════════════════════════════════════════

-- 1. FIX DELETION TRAPS: Update FK constraints to ON DELETE SET NULL
-- This allows buyers and sellers to delete their accounts without FK errors.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_buyer_id_fkey 
  FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_seller_id_fkey 
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_reviewer_id_fkey 
  FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewee_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_reviewee_id_fkey 
  FOREIGN KEY (reviewee_id) REFERENCES profiles(id) ON DELETE SET NULL;


-- 2. FIX MALICIOUS UPLOADS: Add MIME-type/Extension restrictions to buckets

-- Avatars
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  );

-- Listing Media
DROP POLICY IF EXISTS "Authenticated users can upload listing media" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-media'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'mp4')
  );

-- Seller Docs
DROP POLICY IF EXISTS "Authenticated users can upload seller docs" ON storage.objects;
CREATE POLICY "Authenticated users can upload seller docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'seller-docs'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'pdf')
  );
