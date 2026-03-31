-- Add attendance_marked to events: when true, attendance is locked (no further edits)
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_marked BOOLEAN DEFAULT FALSE;
