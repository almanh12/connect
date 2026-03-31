-- Run this in Supabase SQL Editor if practice sessions show "Not submitted" after completing
-- Ensures users can UPDATE their own practice_sessions rows

DROP POLICY IF EXISTS "Users can update own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can update their own practice sessions" ON practice_sessions;

CREATE POLICY "Users can update their own practice sessions"
  ON practice_sessions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
