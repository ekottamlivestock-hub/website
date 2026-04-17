-- ════════════════════════════════════════════════════
-- EKOTTAM — Fix IDOR in Seller Docs Storage Policy
-- Created: 2026-04-12
-- ════════════════════════════════════════════════════

-- 1. Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can upload seller docs" ON storage.objects;

-- 2. Re-create it with folder-level ownership enforcement
CREATE POLICY "Authenticated users can upload seller docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'seller-docs'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
