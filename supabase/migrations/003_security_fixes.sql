-- ════════════════════════════════════════════════════
-- EKOTTAM — Security Fixes Migration
-- Created: 2026-04-12
-- Resolves C3, H2, and M1 from Security Audit
-- ════════════════════════════════════════════════════

-- 1. FIX C3: Add INSERT policy for notifications
-- (Allows authenticated users/helpers.js to send notifications via RLS)
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 2. FIX H2: Add UPDATE policy for orders so sellers can manage their incoming orders
CREATE POLICY "Sellers can update their orders"
  ON orders FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- 3. FIX M1: Restrict listing-media uploads to specific folder structure matching the user ID
-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can upload listing media" ON storage.objects;

-- Re-create it with folder-level ownership enforcement
CREATE POLICY "Authenticated users can upload listing media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-media'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
