-- API usage tracking for rate limiting (chat messages, practice evaluations)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('chat', 'practice_eval')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_usage_user_action_created_idx
  ON api_usage(user_id, action, created_at DESC);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own api_usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_usage"
  ON api_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
