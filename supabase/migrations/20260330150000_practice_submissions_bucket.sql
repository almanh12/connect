-- Private bucket for practice PDF uploads (client uploads; API reads via service role).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'practice-submissions',
  'practice-submissions',
  false,
  52428800,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "practice_submissions_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "practice_submissions_select_own" ON storage.objects;
DROP POLICY IF EXISTS "practice_submissions_update_own" ON storage.objects;
DROP POLICY IF EXISTS "practice_submissions_delete_own" ON storage.objects;

CREATE POLICY "practice_submissions_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'practice-submissions'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "practice_submissions_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'practice-submissions'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "practice_submissions_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'practice-submissions'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "practice_submissions_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'practice-submissions'
  AND split_part(name, '/', 1) = auth.uid()::text
);
