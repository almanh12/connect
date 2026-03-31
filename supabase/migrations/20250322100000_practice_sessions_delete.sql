-- Allow users to update their own practice sessions (for submit flow)
CREATE POLICY "Users can update own practice sessions"
  ON practice_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own practice sessions
CREATE POLICY "Users can delete own practice sessions"
  ON practice_sessions FOR DELETE
  USING (auth.uid() = user_id);
