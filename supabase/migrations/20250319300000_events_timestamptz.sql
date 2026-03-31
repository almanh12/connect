-- Fix events table: ensure start_time and end_time use TIMESTAMPTZ (not TIME)
-- The "invalid input syntax for type time" error occurs when the schema uses TIME
-- but the app passes ISO timestamps. This migration fixes existing tables.

DO $$
DECLARE
  start_type text;
  end_type text;
BEGIN
  SELECT data_type INTO start_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_time';

  SELECT data_type INTO end_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'end_time';

  -- Only convert if columns are time type
  IF start_type IN ('time without time zone', 'time') THEN
    ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time_new TIMESTAMPTZ;
    UPDATE events SET start_time_new = ('2000-01-01'::date + start_time::time)::timestamptz
    WHERE start_time_new IS NULL AND start_time IS NOT NULL;
    ALTER TABLE events DROP COLUMN start_time;
    ALTER TABLE events RENAME COLUMN start_time_new TO start_time;
  END IF;

  IF end_type IN ('time without time zone', 'time') THEN
    ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time_new TIMESTAMPTZ;
    UPDATE events SET end_time_new = ('2000-01-01'::date + end_time::time)::timestamptz
    WHERE end_time_new IS NULL AND end_time IS NOT NULL;
    ALTER TABLE events DROP COLUMN end_time;
    ALTER TABLE events RENAME COLUMN end_time_new TO end_time;
  END IF;
END $$;
