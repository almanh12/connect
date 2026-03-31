-- Consolidate practice_sessions RLS policies so INSERT/UPDATE/SELECT/DELETE all work with auth.uid().
-- Safe to re-run: drops known policy name variants then recreates canonical policies.
-- Fixes 403 on /api/practice/save when a deployment is missing UPDATE or has conflicting policy names.

DROP POLICY IF EXISTS "Users can read own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can read their own practice sessions" ON practice_sessions;
CREATE POLICY "Users can read own practice sessions"
  ON practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can insert their own practice sessions" ON practice_sessions;
CREATE POLICY "Users can insert own practice sessions"
  ON practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can update their own practice sessions" ON practice_sessions;
CREATE POLICY "Users can update their own practice sessions"
  ON practice_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can delete their own practice sessions" ON practice_sessions;
CREATE POLICY "Users can delete own practice sessions"
  ON practice_sessions FOR DELETE
  USING (auth.uid() = user_id);
