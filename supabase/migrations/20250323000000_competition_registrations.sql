-- Competition registrations for DECA event sign-ups
CREATE TABLE IF NOT EXISTS competition_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_code TEXT NOT NULL,
  event_name TEXT NOT NULL,
  competition_level TEXT NOT NULL CHECK (competition_level IN ('regional', 'district', 'provincial', 'icdc')) DEFAULT 'regional',
  status TEXT NOT NULL CHECK (status IN ('registered', 'confirmed', 'completed', 'withdrawn')) DEFAULT 'registered',
  partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS competition_registrations_chapter_id_idx ON competition_registrations(chapter_id);
CREATE INDEX IF NOT EXISTS competition_registrations_user_id_idx ON competition_registrations(user_id);
CREATE INDEX IF NOT EXISTS competition_registrations_event_code_idx ON competition_registrations(event_code);

ALTER TABLE competition_registrations ENABLE ROW LEVEL SECURITY;

-- Users can view registrations in their chapter
CREATE POLICY "Users can view their chapter registrations"
  ON competition_registrations FOR SELECT
  USING (
    chapter_id IN (SELECT chapter_id FROM profiles WHERE id = auth.uid())
  );

-- Officers/admins can manage all chapter registrations
CREATE POLICY "Admins can manage registrations"
  ON competition_registrations FOR ALL
  USING (
    chapter_id IN (
      SELECT chapter_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'officer', 'advisor')
    )
  )
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'officer', 'advisor')
    )
  );

-- Users can manage their own registrations (insert, update, delete)
CREATE POLICY "Users can manage own registrations"
  ON competition_registrations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
