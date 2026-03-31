-- Add recurring event columns to events table
-- recurrence_type: 'weekly' | 'biweekly' | 'monthly'
-- recurrence_end: date when recurrence stops
-- is_recurring: whether the event repeats

ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end date DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
