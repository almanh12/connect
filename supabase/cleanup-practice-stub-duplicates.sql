-- practice_sessions has no `status` column — use score IS NULL for "not submitted" stubs.
-- Run SELECT first to review, then DELETE.

-- 1) List your sessions (run in SQL Editor while logged in as the user, or replace user id)
SELECT id, event_code, event_category, score, feedback, created_at
FROM practice_sessions
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- 2) Preview stub rows that look like duplicates (no score, with a scored sibling within 10 minutes, same event)
WITH ev AS (
  SELECT
    id,
    user_id,
    COALESCE(event_code, event_category) AS ev,
    created_at,
    score
  FROM practice_sessions
)
SELECT
  a.id AS stub_id_to_delete,
  a.created_at AS stub_at,
  b.id AS scored_id,
  b.score
FROM ev a
JOIN ev b
  ON a.user_id = b.user_id
 AND a.ev = b.ev
 AND a.score IS NULL
 AND b.score IS NOT NULL
 AND a.created_at < b.created_at
 AND EXTRACT(EPOCH FROM (b.created_at - a.created_at)) / 60 <= 10;

-- 3) Delete those stubs (uncomment after verifying step 2)
/*
DELETE FROM practice_sessions
WHERE id IN (
  WITH ev AS (
    SELECT
      id,
      user_id,
      COALESCE(event_code, event_category) AS ev,
      created_at,
      score
    FROM practice_sessions
  )
  SELECT a.id
  FROM ev a
  JOIN ev b
    ON a.user_id = b.user_id
   AND a.ev = b.ev
   AND a.score IS NULL
   AND b.score IS NOT NULL
   AND a.created_at < b.created_at
   AND EXTRACT(EPOCH FROM (b.created_at - a.created_at)) / 60 <= 10
);
*/
