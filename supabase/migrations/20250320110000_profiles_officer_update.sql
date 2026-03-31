-- Allow officers to update engagement_score and tier for chapter members
-- (recalculateUserScore needs this when awarding points to members)
CREATE POLICY "Officers can update chapter member engagement"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
      AND me.role IN ('owner', 'officer', 'advisor')
      AND me.chapter_id IS NOT NULL
      AND me.chapter_id = profiles.chapter_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
      AND me.role IN ('owner', 'officer', 'advisor')
      AND me.chapter_id IS NOT NULL
      AND me.chapter_id = profiles.chapter_id
    )
  );
