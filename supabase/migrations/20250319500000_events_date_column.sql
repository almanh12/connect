-- Add date column to events table for DATE + TIME schema
-- Use when start_time and end_time are TIME type (not TIMESTAMPTZ)
ALTER TABLE events ADD COLUMN IF NOT EXISTS date date DEFAULT NULL;
