-- Run this in Supabase SQL Editor if migrations haven't been applied via supabase db push
-- Fixes: attendance lock, points not awarded, recurring events
-- Copy and paste into SQL Editor, then Run

-- 1. engagement_points table (for attendance, practice, etc.)
CREATE TABLE IF NOT EXISTS engagement_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS engagement_points_user_id_idx ON engagement_points(user_id);
CREATE INDEX IF NOT EXISTS engagement_points_created_at_idx ON engagement_points(created_at);

-- 2. manual_points table (for admin-awarded bonus points)
CREATE TABLE IF NOT EXISTS manual_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT,
  awarded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS manual_points_user_id_idx ON manual_points(user_id);

-- 3. profiles: engagement_score and tier (for dashboard/leaderboard)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Bronze';

-- 4. events: attendance_marked (locks attendance after save)
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_marked BOOLEAN DEFAULT FALSE;

-- 4b. attendance table + RLS (officers can insert/update for chapter members)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS attendance_event_id_idx ON attendance(event_id);
CREATE INDEX IF NOT EXISTS attendance_user_id_idx ON attendance(user_id);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Officers can read chapter attendance" ON attendance;
CREATE POLICY "Officers can read chapter attendance"
  ON attendance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e JOIN profiles me ON me.id = auth.uid()
      WHERE e.id = attendance.event_id AND me.role IN ('owner', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL AND e.chapter_id = me.chapter_id
    )
  );
DROP POLICY IF EXISTS "Officers can insert chapter attendance" ON attendance;
CREATE POLICY "Officers can insert chapter attendance"
  ON attendance FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e JOIN profiles me ON me.id = auth.uid()
      JOIN profiles target ON target.id = attendance.user_id
      WHERE e.id = attendance.event_id AND me.role IN ('owner', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL AND e.chapter_id = me.chapter_id
        AND target.chapter_id = me.chapter_id
    )
  );
DROP POLICY IF EXISTS "Officers can update chapter attendance" ON attendance;
CREATE POLICY "Officers can update chapter attendance"
  ON attendance FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e JOIN profiles me ON me.id = auth.uid()
      WHERE e.id = attendance.event_id AND me.role IN ('owner', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL AND e.chapter_id = me.chapter_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e JOIN profiles me ON me.id = auth.uid()
      WHERE e.id = attendance.event_id AND me.role IN ('owner', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL AND e.chapter_id = me.chapter_id
    )
  );
DROP POLICY IF EXISTS "Users can read own attendance" ON attendance;
CREATE POLICY "Users can read own attendance"
  ON attendance FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. events: recurring_group_id (links recurring event instances)
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_group_id UUID DEFAULT NULL;
CREATE INDEX IF NOT EXISTS events_recurring_group_id_idx ON events(recurring_group_id);

-- 6. RLS: allow officers to update chapter members' engagement_score
DROP POLICY IF EXISTS "Officers can update chapter member engagement" ON profiles;
CREATE POLICY "Officers can update chapter member engagement"
  ON profiles FOR UPDATE TO authenticated
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

-- 7. RLS for engagement_points (server actions validate officer role)
ALTER TABLE engagement_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can insert engagement points" ON engagement_points;
CREATE POLICY "Authenticated can insert engagement points"
  ON engagement_points FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can read own engagement points" ON engagement_points;
CREATE POLICY "Users can read own engagement points"
  ON engagement_points FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 8. RLS for manual_points
ALTER TABLE manual_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can insert manual points" ON manual_points;
CREATE POLICY "Authenticated can insert manual points"
  ON manual_points FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can read own manual points" ON manual_points;
CREATE POLICY "Users can read own manual points"
  ON manual_points FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 8b. strategies table (engagement strategies with intake and goal tracking)
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  tags TEXT[] DEFAULT '{}',
  problem_statement TEXT,
  action_steps JSONB DEFAULT '[]',
  expected_impact TEXT,
  timeline TEXT,
  success_metrics JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'active', 'completed', 'dismissed')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  intake_data JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS strategies_chapter_id_idx ON strategies(chapter_id);
CREATE INDEX IF NOT EXISTS strategies_status_idx ON strategies(status);
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Officers can read chapter strategies" ON strategies;
CREATE POLICY "Officers can read chapter strategies" ON strategies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles me WHERE me.id = auth.uid() AND me.role IN ('owner', 'admin', 'officer', 'advisor') AND me.chapter_id = strategies.chapter_id));
DROP POLICY IF EXISTS "Officers can insert chapter strategies" ON strategies;
CREATE POLICY "Officers can insert chapter strategies" ON strategies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles me WHERE me.id = auth.uid() AND me.role IN ('owner', 'admin', 'officer', 'advisor') AND me.chapter_id = strategies.chapter_id));
DROP POLICY IF EXISTS "Officers can update chapter strategies" ON strategies;
CREATE POLICY "Officers can update chapter strategies" ON strategies FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles me WHERE me.id = auth.uid() AND me.role IN ('owner', 'admin', 'officer', 'advisor') AND me.chapter_id = strategies.chapter_id));
DROP POLICY IF EXISTS "Officers can delete chapter strategies" ON strategies;
CREATE POLICY "Officers can delete chapter strategies" ON strategies FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles me WHERE me.id = auth.uid() AND me.role IN ('owner', 'admin', 'officer', 'advisor') AND me.chapter_id = strategies.chapter_id));

-- 9. api_usage table (rate limiting for chat and practice evaluation)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('chat', 'practice_eval')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS api_usage_user_action_created_idx
  ON api_usage(user_id, action, created_at DESC);
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own api_usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own api_usage"
  ON api_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 10. practice_sessions: allow users to update and delete their own sessions
DROP POLICY IF EXISTS "Users can update own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can update their own practice sessions" ON practice_sessions;
CREATE POLICY "Users can update their own practice sessions"
  ON practice_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can delete their own practice sessions" ON practice_sessions;
CREATE POLICY "Users can delete their own practice sessions"
  ON practice_sessions FOR DELETE
  USING (user_id = auth.uid());
