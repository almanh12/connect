-- Add attendance_submitted_at to events: when set, attendance is locked (no further edits)
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_submitted_at TIMESTAMPTZ DEFAULT NULL;
