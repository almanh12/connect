-- Create attendance table (if not exists) and RLS policies
-- Officers must be able to insert/update attendance for chapter members (user_id != auth.uid())

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

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Officers can SELECT attendance for events in their chapter
DROP POLICY IF EXISTS "Officers can read chapter attendance" ON attendance;
CREATE POLICY "Officers can read chapter attendance"
  ON attendance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles me ON me.id = auth.uid()
      WHERE e.id = attendance.event_id
        AND me.role IN ('owner', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL
        AND e.chapter_id = me.chapter_id
    )
  );

-- Officers can INSERT attendance for chapter events (user_id can be any chapter member)
DROP POLICY IF EXISTS "Officers can insert chapter attendance" ON attendance;
CREATE POLICY "Officers can insert chapter attendance"
  ON attendance FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles me ON me.id = auth.uid()
      JOIN profiles target ON target.id = attendance.user_id
      WHERE e.id = attendance.event_id
        AND me.role IN ('owner', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL
        AND e.chapter_id = me.chapter_id
        AND target.chapter_id = me.chapter_id
    )
  );

-- Officers can UPDATE attendance for chapter events
DROP POLICY IF EXISTS "Officers can update chapter attendance" ON attendance;
CREATE POLICY "Officers can update chapter attendance"
  ON attendance FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles me ON me.id = auth.uid()
      WHERE e.id = attendance.event_id
        AND me.role IN ('owner', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL
        AND e.chapter_id = me.chapter_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles me ON me.id = auth.uid()
      WHERE e.id = attendance.event_id
        AND me.role IN ('owner', 'officer', 'advisor')
        AND me.chapter_id IS NOT NULL
        AND e.chapter_id = me.chapter_id
    )
  );

-- Members can read their own attendance (for dashboard, badges, etc.)
DROP POLICY IF EXISTS "Users can read own attendance" ON attendance;
CREATE POLICY "Users can read own attendance"
  ON attendance FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
