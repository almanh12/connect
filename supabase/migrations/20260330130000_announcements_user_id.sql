-- App uses user_id for the member who posted (matches other chapter tables).
-- Safe if the column already exists from an older schema.
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS announcements_user_id_idx ON public.announcements(user_id);
