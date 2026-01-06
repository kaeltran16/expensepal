-- Create table for caching AI budget recommendations
-- This reduces LLM API costs by storing recommendations and only regenerating weekly

CREATE TABLE IF NOT EXISTS budget_recommendations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Recommendation data (stored as JSONB for flexibility)
  recommendations JSONB NOT NULL,

  -- Metadata
  months_analyzed INTEGER NOT NULL DEFAULT 12,
  data_points INTEGER NOT NULL, -- Number of expenses analyzed
  total_savings_opportunity BIGINT DEFAULT 0,
  ai_powered_count INTEGER DEFAULT 0,
  algorithmic_count INTEGER DEFAULT 0,

  -- Timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT budget_recommendations_cache_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_budget_recommendations_cache_user_id
  ON budget_recommendations_cache(user_id);

-- Index for finding expired recommendations
CREATE INDEX IF NOT EXISTS idx_budget_recommendations_cache_expires_at
  ON budget_recommendations_cache(expires_at);

-- Index for user + months lookups (faster cache checks)
CREATE INDEX IF NOT EXISTS idx_budget_recommendations_cache_user_months
  ON budget_recommendations_cache(user_id, months_analyzed, expires_at);

-- Enable Row Level Security
ALTER TABLE budget_recommendations_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own recommendations
CREATE POLICY "Users can view their own budget recommendations"
  ON budget_recommendations_cache
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget recommendations"
  ON budget_recommendations_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget recommendations"
  ON budget_recommendations_cache
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget recommendations"
  ON budget_recommendations_cache
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to clean up expired recommendations (run via cron job or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_budget_recommendations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM budget_recommendations_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_budget_recommendations() TO authenticated;

COMMENT ON TABLE budget_recommendations_cache IS 'Caches AI-generated budget recommendations to reduce LLM API costs. Recommendations expire after 7 days.';
COMMENT ON COLUMN budget_recommendations_cache.recommendations IS 'JSONB array of budget recommendation objects with category, amount, reasoning, etc.';
COMMENT ON COLUMN budget_recommendations_cache.expires_at IS 'Recommendations older than this should be regenerated';
