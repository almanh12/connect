-- App uses `content` for announcement text. If an older `body` column exists
-- (NOT NULL) alongside `content`, inserts that only set `content` can still fail
-- or leave `body` null. Drop legacy `body` when both existed.
ALTER TABLE public.announcements DROP COLUMN IF EXISTS body;
