-- Engagement strategies table with intake data and goal tracking
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
CREATE INDEX IF NOT EXISTS strategies_chapter_status_idx ON strategies(chapter_id, status);

ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officers can read chapter strategies" ON strategies;
CREATE POLICY "Officers can read chapter strategies"
  ON strategies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
        AND me.role IN ('owner', 'admin', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL
        AND me.chapter_id = strategies.chapter_id
    )
  );

DROP POLICY IF EXISTS "Officers can insert chapter strategies" ON strategies;
CREATE POLICY "Officers can insert chapter strategies"
  ON strategies FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
        AND me.role IN ('owner', 'admin', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL
        AND me.chapter_id = strategies.chapter_id
    )
  );

DROP POLICY IF EXISTS "Officers can update chapter strategies" ON strategies;
CREATE POLICY "Officers can update chapter strategies"
  ON strategies FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
        AND me.role IN ('owner', 'admin', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL
        AND me.chapter_id = strategies.chapter_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
        AND me.role IN ('owner', 'admin', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL
        AND me.chapter_id = strategies.chapter_id
    )
  );

DROP POLICY IF EXISTS "Officers can delete chapter strategies" ON strategies;
CREATE POLICY "Officers can delete chapter strategies"
  ON strategies FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
        AND me.role IN ('owner', 'admin', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL
        AND me.chapter_id = strategies.chapter_id
    )
  );
