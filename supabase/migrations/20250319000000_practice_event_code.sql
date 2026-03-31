-- Add event_code to practice_sessions for Ontario DECA event tracking
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS event_code TEXT;
