-- Ensure users can UPDATE their own practice_sessions (submit flow).
-- Safe to re-run: drops conflicting names then creates.

DROP POLICY IF EXISTS "Users can update own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can update their own practice sessions" ON practice_sessions;

CREATE POLICY "Users can update their own practice sessions"
  ON practice_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
