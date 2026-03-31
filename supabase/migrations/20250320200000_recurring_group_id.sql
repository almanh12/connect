-- Add recurring_group_id to link all instances of a recurring event
-- All events in the same series share the same recurring_group_id (UUID)
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_group_id UUID DEFAULT NULL;

CREATE INDEX IF NOT EXISTS events_recurring_group_id_idx ON events(recurring_group_id);
