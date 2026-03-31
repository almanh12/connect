-- Add 'admin' role and migrate officer/advisor to admin
-- Role hierarchy: owner > admin > member

-- 1. Migrate existing officer and advisor to admin
UPDATE profiles SET role = 'admin' WHERE role IN ('officer', 'advisor');

-- 2. Update RLS policies to use 'admin' (backward compat: keep officer/advisor for any stragglers)
DROP POLICY IF EXISTS "Officers can update chapter member engagement" ON profiles;
CREATE POLICY "Owners and admins can update chapter member engagement"
  ON profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
      AND me.role IN ('owner', 'admin', 'officer', 'advisor')
      AND me.chapter_id IS NOT NULL
      AND me.chapter_id = profiles.chapter_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
      AND me.role IN ('owner', 'admin', 'officer', 'advisor')
      AND me.chapter_id IS NOT NULL
      AND me.chapter_id = profiles.chapter_id
    )
  );
