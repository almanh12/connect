-- ============================================================================
-- announcements: columns referenced by the app (single pass)
--
-- Inserts (admin/announcements/actions): chapter_id, title, content, user_id,
--   is_pinned, priority
-- Updates: title, content, priority, updated_at
-- Filters: id, chapter_id
-- Selects: * or id, title, content, created_at, user_id, etc.
-- ============================================================================

-- Poster (auth user)
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS announcements_user_id_idx ON public.announcements(user_id);

-- Pin state (insert sets false; reserved for future UI)
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Priority tier (may already exist from 20250318000000_announcements_notifications.sql)
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Last modified (update action sets explicitly)
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.announcements
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- ---------------------------------------------------------------------------
-- RLS: chapter members read; officers/advisors/owners write
-- ---------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select_chapter_members" ON public.announcements;
CREATE POLICY "announcements_select_chapter_members"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    chapter_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.chapter_id IS NOT NULL
        AND p.chapter_id = announcements.chapter_id
    )
  );

DROP POLICY IF EXISTS "announcements_insert_officers" ON public.announcements;
CREATE POLICY "announcements_insert_officers"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    chapter_id IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.chapter_id = announcements.chapter_id
        AND p.role IN ('owner', 'admin', 'officer', 'advisor')
    )
  );

DROP POLICY IF EXISTS "announcements_update_officers" ON public.announcements;
CREATE POLICY "announcements_update_officers"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.chapter_id = announcements.chapter_id
        AND p.role IN ('owner', 'admin', 'officer', 'advisor')
    )
  )
  WITH CHECK (
    chapter_id IS NOT NULL
    AND chapter_id = (SELECT p.chapter_id FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "announcements_delete_officers" ON public.announcements;
CREATE POLICY "announcements_delete_officers"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.chapter_id = announcements.chapter_id
        AND p.role IN ('owner', 'admin', 'officer', 'advisor')
    )
  );
