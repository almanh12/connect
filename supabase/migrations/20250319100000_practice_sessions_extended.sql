-- Extend practice_sessions for Ontario DECA PI scoring and tracking
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS pi_scores JSONB;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
