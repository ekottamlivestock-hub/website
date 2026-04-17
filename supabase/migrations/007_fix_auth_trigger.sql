-- ════════════════════════════════════════════════════
-- EKOTTAM — Fix OAuth Database Trigger
-- Created: 2026-04-12
-- Resolves "Database error saving new user"
-- ════════════════════════════════════════════════════

-- The original function might fail due to strict search_path definitions
-- inside Supabase Auth when executing triggers via external providers like Google.
-- It requires explicit schema definitions (`public.profiles`) and Setting the search_path.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, google_id, role, seller_status)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the trigger uses the updated public schema reference
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
