-- Add case study and student response to practice_sessions
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS case_study TEXT;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS student_response TEXT;
