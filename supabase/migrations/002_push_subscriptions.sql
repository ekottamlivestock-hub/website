-- ════════════════════════════════════════════════════
-- EKOTTAM — Push Notifications Migration
-- Created: 2026-04-12
-- ════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint) -- Prevent duplicate entries for the same device
);

COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API browser subscriptions for users (to send background push notifications).';

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admin can see all subscriptions (needed for sending systemic notifications if looping manually)
CREATE POLICY "Admins can view all subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service Role Key (used in our Next.js API route) bypasses RLS naturally,
-- so our backend Node environment can fetch and send push notifications to these endpoints freely.
