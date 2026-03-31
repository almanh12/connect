-- Fix duplicate practice sessions (same user, same event, within 5 minutes)
-- Duplicates occur when: Start → INSERT row 1; Submit → UPDATE fails → retry does INSERT row 2
-- Keep the row WITH score/feedback (completed); remove the stub (no score)

-- 1. FIND duplicates: list sessions ordered for inspection
SELECT id, user_id, event_code, event_category, created_at, score, feedback
FROM practice_sessions
ORDER BY user_id, COALESCE(event_code, event_category), created_at DESC;

-- 2. PREVIEW rows that would be deleted (stubs: no score, with a "completed" sibling within 5 min)
WITH ev AS (
  SELECT id, user_id,
         COALESCE(event_code, event_category) AS ev,
         created_at, score, feedback
  FROM practice_sessions
),
pairs AS (
  SELECT
    e1.id AS stub_id,
    e2.id AS completed_id,
    e1.user_id,
    e1.ev,
    e1.created_at AS stub_created,
    e2.created_at AS completed_created,
    e2.score
  FROM ev e1
  JOIN ev e2 ON e1.user_id = e2.user_id AND e1.ev = e2.ev AND e1.created_at < e2.created_at
  WHERE (e1.score IS NULL AND (e1.feedback IS NULL OR e1.feedback = ''))
    AND (e2.score IS NOT NULL OR (e2.feedback IS NOT NULL AND e2.feedback <> ''))
    AND EXTRACT(EPOCH FROM (e2.created_at - e1.created_at)) / 60 <= 5
)
SELECT stub_id AS id_to_delete, user_id, ev AS event, stub_created, completed_id, score
FROM pairs;

-- 3. DELETE the stub rows (run after verifying step 2)
/*
DELETE FROM practice_sessions
WHERE id IN (
  WITH ev AS (
    SELECT id, user_id,
           COALESCE(event_code, event_category) AS ev,
           created_at, score, feedback
    FROM practice_sessions
  ),
  pairs AS (
    SELECT e1.id AS stub_id
    FROM ev e1
    JOIN ev e2 ON e1.user_id = e2.user_id AND e1.ev = e2.ev AND e1.created_at < e2.created_at
    WHERE (e1.score IS NULL AND (e1.feedback IS NULL OR e1.feedback = ''))
      AND (e2.score IS NOT NULL OR (e2.feedback IS NOT NULL AND e2.feedback <> ''))
      AND EXTRACT(EPOCH FROM (e2.created_at - e1.created_at)) / 60 <= 5
  )
  SELECT stub_id FROM pairs
);
*/
