-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EKOTTAM — Animal Marketplace Database Schema
-- Supabase (PostgreSQL) Migration
-- Created: 2026-04-12
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


-- ════════════════════════════════════════════════════
-- EXTENSIONS (ensure required extensions are enabled)
-- ════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ════════════════════════════════════════════════════
-- TABLE 1: PROFILES
-- Extends Supabase auth.users. Auto-created on Google login.
-- ════════════════════════════════════════════════════
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  google_id TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin', 'seller', 'buyer')),
  seller_status TEXT NOT NULL DEFAULT 'not_applied' 
    CHECK (seller_status IN ('not_applied', 'pending', 'approved', 'rejected')),
  seller_requested_at TIMESTAMPTZ,
  state TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth. Auto-created on Google OAuth signup.';
COMMENT ON COLUMN profiles.role IS 'User role: admin, seller, or buyer. Default is buyer.';
COMMENT ON COLUMN profiles.seller_status IS 'Seller application status. Buyers start as not_applied.';


-- ════════════════════════════════════════════════════
-- TABLE 2: ANIMAL CATEGORIES
-- Fully managed by admin. Dynamic — admin can add/edit/remove anytime.
-- ════════════════════════════════════════════════════
CREATE TABLE animal_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE animal_categories IS 'Animal categories managed by admin (e.g., Cow, Hen, Goat).';


-- ════════════════════════════════════════════════════
-- TABLE 3: ANIMAL BREEDS
-- Sub-categories under each animal category. Managed by admin.
-- Example: Cow → Gir, HF, Jersey. Hen → Broiler, Layer, Desi.
-- ════════════════════════════════════════════════════
CREATE TABLE animal_breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES animal_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE animal_breeds IS 'Breeds under each animal category (e.g., Cow → Gir, HF, Jersey).';


-- ════════════════════════════════════════════════════
-- TABLE 4: LISTINGS
-- Each animal for sale is a listing. Created by seller, approved by admin.
-- ════════════════════════════════════════════════════
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES animal_categories(id),
  breed_id UUID REFERENCES animal_breeds(id),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'negotiable', 'auction')),
  quantity INT DEFAULT 1,
  age_value INT,
  age_unit TEXT CHECK (age_unit IN ('days', 'months', 'years')),
  gender TEXT CHECK (gender IN ('male', 'female', 'unknown')),
  weight_kg NUMERIC,
  health_status TEXT CHECK (health_status IN ('healthy', 'vaccinated', 'certified', 'unknown')),
  vaccination_tags TEXT[],
  state TEXT,
  city TEXT,
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'sold', 'paused')),
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE listings IS 'Animal listings created by sellers, requiring admin approval before public visibility.';
COMMENT ON COLUMN listings.status IS 'Listing lifecycle: draft → pending_review → approved/rejected → sold/paused.';
COMMENT ON COLUMN listings.vaccination_tags IS 'Array of vaccination tags (e.g., FMD, Brucella, Anthrax).';


-- ════════════════════════════════════════════════════
-- TABLE 5: LISTING MEDIA
-- Photos and videos attached to a listing. Multiple per listing.
-- ════════════════════════════════════════════════════
CREATE TABLE listing_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE listing_media IS 'Photos and videos attached to animal listings.';


-- ════════════════════════════════════════════════════
-- TABLE 6: SELLER APPLICATIONS
-- When a buyer wants to become a seller, they submit this form.
-- Admin reviews and approves or rejects.
-- ════════════════════════════════════════════════════
CREATE TABLE seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  business_type TEXT CHECK (business_type IN ('individual', 'farm', 'dealer')),
  address TEXT,
  state TEXT,
  city TEXT,
  id_proof_url TEXT,
  farm_photo_url TEXT,
  about TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE seller_applications IS 'Buyer-to-seller upgrade applications, reviewed by admin.';


-- ════════════════════════════════════════════════════
-- TABLE 7: LISTING APPROVALS
-- Every admin action on a listing is logged here. Full audit trail.
-- ════════════════════════════════════════════════════
CREATE TABLE listing_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id),
  action TEXT CHECK (action IN ('approved', 'rejected', 'requested_changes')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE listing_approvals IS 'Audit trail: every admin action on listings is logged.';


-- ════════════════════════════════════════════════════
-- TABLE 8: ORDERS
-- Created when buyer purchases a listing.
-- ════════════════════════════════════════════════════
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  buyer_id UUID REFERENCES profiles(id),
  seller_id UUID REFERENCES profiles(id),
  quantity INT DEFAULT 1,
  total_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status TEXT DEFAULT 'unpaid' 
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_method TEXT,
  delivery_address TEXT,
  buyer_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Purchase orders linking buyers, sellers, and listings.';


-- ════════════════════════════════════════════════════
-- TABLE 9: REVIEWS
-- Buyer reviews seller after order is delivered. One review per order.
-- ════════════════════════════════════════════════════
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id),
  reviewee_id UUID REFERENCES profiles(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reviews IS 'Post-delivery reviews — one review per order, buyer rates seller.';


-- ════════════════════════════════════════════════════
-- TABLE 10: WISHLISTS
-- Buyers can save listings they are interested in.
-- ════════════════════════════════════════════════════
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

COMMENT ON TABLE wishlists IS 'Saved/bookmarked listings per user.';


-- ════════════════════════════════════════════════════
-- TABLE 11: NOTIFICATIONS
-- All in-app notifications for all 3 roles.
-- ════════════════════════════════════════════════════
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'In-app notifications for all roles (new_order, listing_approved, etc.).';


-- ════════════════════════════════════════════════════
-- TABLE 12: REPORTS
-- Buyers or admins can flag suspicious or fraudulent listings.
-- ════════════════════════════════════════════════════
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reports IS 'Flagged/reported listings for admin review.';


-- ════════════════════════════════════════════════════
-- INDEXES — Performance optimization for common queries
-- ════════════════════════════════════════════════════

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_seller_status ON profiles(seller_status);
CREATE INDEX idx_profiles_google_id ON profiles(google_id);

-- Animal categories & breeds
CREATE INDEX idx_animal_breeds_category_id ON animal_breeds(category_id);
CREATE INDEX idx_animal_categories_slug ON animal_categories(slug);

-- Listings (most queried table)
CREATE INDEX idx_listings_seller_id ON listings(seller_id);
CREATE INDEX idx_listings_category_id ON listings(category_id);
CREATE INDEX idx_listings_breed_id ON listings(breed_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_state_city ON listings(state, city);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_price ON listings(price);

-- Listing media
CREATE INDEX idx_listing_media_listing_id ON listing_media(listing_id);
CREATE INDEX idx_listing_media_sort_order ON listing_media(listing_id, sort_order);

-- Seller applications
CREATE INDEX idx_seller_applications_user_id ON seller_applications(user_id);
CREATE INDEX idx_seller_applications_status ON seller_applications(status);

-- Listing approvals
CREATE INDEX idx_listing_approvals_listing_id ON listing_approvals(listing_id);

-- Orders
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_listing_id ON orders(listing_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Reviews
CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);

-- Wishlists
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_listing_id ON wishlists(listing_id);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Reports
CREATE INDEX idx_reports_listing_id ON reports(listing_id);
CREATE INDEX idx_reports_status ON reports(status);


-- ════════════════════════════════════════════════════
-- FUNCTION & TRIGGER: Auto-create profile on Google login
-- ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url, google_id, role, seller_status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'sub',
    'buyer',
    'not_applied'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Auto-creates a profile row when a new user signs up via Google OAuth.';

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ════════════════════════════════════════════════════
-- FUNCTION: Auto-update updated_at timestamp
-- ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — Enable on all tables
-- ════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════
-- RLS POLICIES: PROFILES
-- ════════════════════════════════════════════════════

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);


-- ════════════════════════════════════════════════════
-- RLS POLICIES: ANIMAL CATEGORIES (public read, admin write)
-- ════════════════════════════════════════════════════

CREATE POLICY "Anyone can view active categories"
  ON animal_categories FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can manage categories"
  ON animal_categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════════════════
-- RLS POLICIES: ANIMAL BREEDS (public read, admin write)
-- ════════════════════════════════════════════════════

CREATE POLICY "Anyone can view active breeds"
  ON animal_breeds FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can manage breeds"
  ON animal_breeds FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════════════════
-- RLS POLICIES: LISTINGS
-- ════════════════════════════════════════════════════

-- Public: anyone (even anonymous) can view approved listings
CREATE POLICY "Anyone can view approved listings"
  ON listings FOR SELECT
  USING (status = 'approved');

-- Sellers: full CRUD on their own listings
CREATE POLICY "Sellers can manage own listings"
  ON listings FOR ALL
  USING (auth.uid() = seller_id);

-- Admin: full access to all listings
CREATE POLICY "Admin can manage all listings"
  ON listings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════════════════
-- RLS POLICIES: LISTING MEDIA
-- ════════════════════════════════════════════════════

CREATE POLICY "Anyone can view media of approved listings"
  ON listing_media FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status = 'approved')
  );

CREATE POLICY "Sellers manage own listing media"
  ON listing_media FOR ALL
  USING (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND seller_id = auth.uid())
  );

CREATE POLICY "Admin can manage all listing media"
  ON listing_media FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════════════════
-- RLS POLICIES: SELLER APPLICATIONS
-- ════════════════════════════════════════════════════

CREATE POLICY "User sees own application"
  ON seller_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User submits own application"
  ON seller_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin manages all applications"
  ON seller_applications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════════════════
-- RLS POLICIES: LISTING APPROVALS
-- ════════════════════════════════════════════════════

CREATE POLICY "Admin manages listing approvals"
  ON listing_approvals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Sellers can view approvals on their listings"
  ON listing_approvals FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND seller_id = auth.uid())
  );


-- ════════════════════════════════════════════════════
-- RLS POLICIES: ORDERS
-- ════════════════════════════════════════════════════

CREATE POLICY "Buyers see own orders"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers see orders for their listings"
  ON orders FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admin can manage all orders"
  ON orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════════════════
-- RLS POLICIES: REVIEWS
-- ════════════════════════════════════════════════════

CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "Reviewer can write review"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);


-- ════════════════════════════════════════════════════
-- RLS POLICIES: WISHLISTS
-- ════════════════════════════════════════════════════

CREATE POLICY "Users manage own wishlist"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id);


-- ════════════════════════════════════════════════════
-- RLS POLICIES: NOTIFICATIONS
-- ════════════════════════════════════════════════════

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);


-- ════════════════════════════════════════════════════
-- RLS POLICIES: REPORTS
-- ════════════════════════════════════════════════════

CREATE POLICY "Users submit reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admin manages reports"
  ON reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- Run these in Supabase SQL Editor (requires storage admin)
-- ════════════════════════════════════════════════════

-- 1. Avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Listing media bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-media', 'listing-media', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Seller docs bucket (private — admin only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-docs', 'seller-docs', FALSE)
ON CONFLICT (id) DO NOTHING;


-- ════════════════════════════════════════════════════
-- STORAGE POLICIES: AVATARS (public bucket)
-- ════════════════════════════════════════════════════

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ════════════════════════════════════════════════════
-- STORAGE POLICIES: LISTING MEDIA (public bucket)
-- ════════════════════════════════════════════════════

CREATE POLICY "Anyone can view listing media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-media');

CREATE POLICY "Authenticated users can upload listing media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own listing media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own listing media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ════════════════════════════════════════════════════
-- STORAGE POLICIES: SELLER DOCS (private — admin only read)
-- ════════════════════════════════════════════════════

CREATE POLICY "Admin can view seller docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'seller-docs'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can upload seller docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'seller-docs'
    AND auth.role() = 'authenticated'
  );


-- ════════════════════════════════════════════════════
-- SEED DATA — Initial animal categories and breeds
-- ════════════════════════════════════════════════════

INSERT INTO animal_categories (name, slug, description, is_active) VALUES
  ('Cow',     'cow',     'All breeds of cows and bulls',          TRUE),
  ('Hen',     'hen',     'Poultry including hens and chicks',     TRUE),
  ('Goat',    'goat',    'Goats and kids',                        TRUE),
  ('Buffalo', 'buffalo', 'Buffaloes for dairy and farming',       TRUE),
  ('Sheep',   'sheep',   'Sheep and lambs',                       TRUE),
  ('Pig',     'pig',     'Pigs and piglets',                      TRUE),
  ('Dog',     'dog',     'Farm dogs and guard dogs',              TRUE),
  ('Fish',    'fish',    'Fish for farming and aquaculture',      TRUE);

INSERT INTO animal_breeds (category_id, name, is_active)
SELECT id, 'Gir', TRUE FROM animal_categories WHERE slug = 'cow'
UNION ALL
SELECT id, 'HF (Holstein Friesian)', TRUE FROM animal_categories WHERE slug = 'cow'
UNION ALL
SELECT id, 'Jersey', TRUE FROM animal_categories WHERE slug = 'cow'
UNION ALL
SELECT id, 'Sahiwal', TRUE FROM animal_categories WHERE slug = 'cow'
UNION ALL
SELECT id, 'Broiler', TRUE FROM animal_categories WHERE slug = 'hen'
UNION ALL
SELECT id, 'Layer', TRUE FROM animal_categories WHERE slug = 'hen'
UNION ALL
SELECT id, 'Desi', TRUE FROM animal_categories WHERE slug = 'hen'
UNION ALL
SELECT id, 'Boer', TRUE FROM animal_categories WHERE slug = 'goat'
UNION ALL
SELECT id, 'Sirohi', TRUE FROM animal_categories WHERE slug = 'goat'
UNION ALL
SELECT id, 'Murrah', TRUE FROM animal_categories WHERE slug = 'buffalo';


-- ════════════════════════════════════════════════════
-- DONE! All tables, policies, triggers, storage, and
-- seed data have been created successfully.
-- ════════════════════════════════════════════════════
