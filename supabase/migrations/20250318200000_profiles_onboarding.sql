-- Ensure profiles table has columns needed for onboarding
-- Safe to run: uses IF NOT EXISTS / IF NOT EXISTS for columns

-- Add columns if they don't exist (profiles table may already exist from Supabase setup)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Enable RLS if not already
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if we need to recreate (optional - only if policies are wrong)
-- For now we add policies that allow users to update their own profile

-- Allow users to update their own profile (id = auth.uid())
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
