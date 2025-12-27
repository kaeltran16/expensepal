-- Migration: Workout Scheduling and Exercise Library Enhancements
-- Description: Add scheduling, exercise favorites, and custom exercises
-- Created: 2025-12-21

-- ============================================================================
-- SCHEDULED WORKOUTS TABLE
-- ============================================================================
-- Allows users to plan workouts for specific dates

CREATE TABLE IF NOT EXISTS scheduled_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped')),
  completed_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one workout per day per user
  UNIQUE(user_id, scheduled_date)
);

-- Index for efficient date range queries
CREATE INDEX idx_scheduled_workouts_user_date
  ON scheduled_workouts(user_id, scheduled_date DESC);

-- Index for finding scheduled workouts by template
CREATE INDEX idx_scheduled_workouts_template
  ON scheduled_workouts(template_id)
  WHERE template_id IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_workouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scheduled_workouts_updated_at
  BEFORE UPDATE ON scheduled_workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_workouts_updated_at();

-- ============================================================================
-- EXERCISE FAVORITES TABLE
-- ============================================================================
-- Allows users to bookmark their favorite exercises

CREATE TABLE IF NOT EXISTS exercise_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, exercise_id)
);

-- Index for finding user's favorites
CREATE INDEX idx_exercise_favorites_user
  ON exercise_favorites(user_id, created_at DESC);

-- ============================================================================
-- CUSTOM EXERCISES TABLE
-- ============================================================================
-- Allows users to create their own custom exercises

CREATE TABLE IF NOT EXISTS custom_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  video_url TEXT,
  image_url TEXT,
  instructions TEXT,
  tips TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user's custom exercises
CREATE INDEX idx_custom_exercises_user
  ON custom_exercises(user_id, created_at DESC);

-- Index for searching custom exercises by name
CREATE INDEX idx_custom_exercises_name
  ON custom_exercises(user_id, name);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_exercises_updated_at
  BEFORE UPDATE ON custom_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_exercises_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE scheduled_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHEDULED WORKOUTS POLICIES
-- ============================================================================

-- Users can view their own scheduled workouts
CREATE POLICY "Users can view own scheduled workouts"
  ON scheduled_workouts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own scheduled workouts
CREATE POLICY "Users can insert own scheduled workouts"
  ON scheduled_workouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scheduled workouts
CREATE POLICY "Users can update own scheduled workouts"
  ON scheduled_workouts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scheduled workouts
CREATE POLICY "Users can delete own scheduled workouts"
  ON scheduled_workouts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- EXERCISE FAVORITES POLICIES
-- ============================================================================

-- Users can view their own favorites
CREATE POLICY "Users can view own exercise favorites"
  ON exercise_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert own exercise favorites"
  ON exercise_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own exercise favorites"
  ON exercise_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CUSTOM EXERCISES POLICIES
-- ============================================================================

-- Users can view their own custom exercises
CREATE POLICY "Users can view own custom exercises"
  ON custom_exercises
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own custom exercises
CREATE POLICY "Users can insert own custom exercises"
  ON custom_exercises
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom exercises
CREATE POLICY "Users can update own custom exercises"
  ON custom_exercises
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own custom exercises
CREATE POLICY "Users can delete own custom exercises"
  ON custom_exercises
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for upcoming scheduled workouts with template details
CREATE OR REPLACE VIEW upcoming_scheduled_workouts AS
SELECT
  sw.id,
  sw.user_id,
  sw.scheduled_date,
  sw.status,
  sw.notes,
  sw.created_at,
  sw.updated_at,
  wt.id as template_id,
  wt.name as template_name,
  wt.description as template_description,
  wt.difficulty,
  wt.duration_minutes,
  wt.exercises
FROM scheduled_workouts sw
LEFT JOIN workout_templates wt ON sw.template_id = wt.id
WHERE sw.scheduled_date >= CURRENT_DATE
  AND sw.status = 'scheduled'
ORDER BY sw.scheduled_date ASC;

-- View for exercise library with favorite status
CREATE OR REPLACE VIEW exercises_with_favorites AS
SELECT
  e.*,
  CASE WHEN ef.user_id IS NOT NULL THEN true ELSE false END as is_favorite
FROM exercises e
LEFT JOIN exercise_favorites ef ON e.id = ef.exercise_id AND ef.user_id = auth.uid();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scheduled_workouts IS 'User workout schedule - one workout per day per user';
COMMENT ON TABLE exercise_favorites IS 'User bookmarked exercises for quick access';
COMMENT ON TABLE custom_exercises IS 'User-created custom exercises';

COMMENT ON VIEW upcoming_scheduled_workouts IS 'Upcoming scheduled workouts with template details';
COMMENT ON VIEW exercises_with_favorites IS 'Exercise library with user favorite status';
