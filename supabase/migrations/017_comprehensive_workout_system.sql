-- Migration: Enhanced workout tracking system (Planfit-style, backward compatible)
-- Description: Adds workout profiles, personal records, and analytics while keeping existing schema

-- Note: This migration ADDS features without breaking existing code
-- Existing tables (exercises, workout_templates, workouts, workout_exercises) remain compatible

-- ============================================================================
-- 1. Exercises table (create or enhance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- exercise details
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'flexibility', 'sports')),
  muscle_groups TEXT[] NOT NULL,          -- e.g., ARRAY['chest', 'triceps']
  equipment TEXT,                         -- 'barbell', 'dumbbell', 'bodyweight', 'machine', 'cable'
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),

  -- instructional content
  instructions TEXT,
  tips TEXT,
  video_url TEXT,
  image_url TEXT,

  -- enhanced fields
  description TEXT,
  is_compound BOOLEAN DEFAULT false,
  force_type TEXT CHECK (force_type IN ('push', 'pull', 'static', 'dynamic')),
  gif_url TEXT,
  thumbnail_url TEXT,

  -- timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- add new columns to existing table if it exists
DO $$
BEGIN
  -- add new columns if table exists but columns don't
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'exercises') THEN
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_compound BOOLEAN DEFAULT false;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS force_type TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);

-- ============================================================================
-- 2. Workout templates table (create or enhance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- template details
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER,               -- estimated duration

  -- exercise plan stored as jsonb
  -- format: [{ exercise_id: uuid, sets: 3, reps: '8-12', rest: 90 }]
  exercises JSONB NOT NULL,

  -- template ownership
  is_default BOOLEAN DEFAULT true,        -- system templates vs user-created
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- null for system templates

  -- enhanced fields
  tags TEXT[],
  target_goal TEXT CHECK (target_goal IN ('strength', 'hypertrophy', 'endurance', 'general_fitness')),

  -- timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- add new columns if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'workout_templates') THEN
    ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS tags TEXT[];
    ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS target_goal TEXT;
    ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_tags ON workout_templates USING GIN(tags);

-- trigger for updated_at
DROP TRIGGER IF EXISTS update_workout_templates_updated_at ON workout_templates;
CREATE TRIGGER update_workout_templates_updated_at BEFORE UPDATE ON workout_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Workouts table (create or enhance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,

  -- workout session timing
  workout_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,               -- actual duration (calculated)

  -- additional data
  notes TEXT,
  total_volume INTEGER,                   -- total kg lifted (calculated)

  -- enhanced fields
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped')) DEFAULT 'completed',
  scheduled_date TIMESTAMPTZ,

  -- timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- add new columns if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'workouts') THEN
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- update existing workouts to set status='completed' where completed_at is not null
    UPDATE workouts SET status = 'completed' WHERE completed_at IS NOT NULL AND status IS NULL;
  END IF;
END $$;

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(user_id, status);

-- trigger for updated_at
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Workout exercises table (create or enhance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

  -- exercise ordering and data
  exercise_order INTEGER NOT NULL DEFAULT 0,

  -- sets data stored as jsonb
  -- format: [{ set_number: 1, reps: 10, weight: 60, completed: true, rest: 90 }]
  sets JSONB NOT NULL,

  notes TEXT,

  -- enhanced fields
  total_volume DECIMAL(10, 2),
  max_weight DECIMAL(6, 2),

  -- timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- add new columns if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'workout_exercises') THEN
    ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS total_volume DECIMAL(10, 2);
    ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS max_weight DECIMAL(6, 2);
    ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- ============================================================================
-- Enable RLS on base tables if not already enabled
-- ============================================================================
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- create policies if they don't exist (using DO $$ to avoid errors if they exist)
DO $$
BEGIN
  -- exercises policies (public read)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view exercises' AND tablename = 'exercises') THEN
    CREATE POLICY "Anyone can view exercises" ON exercises FOR SELECT USING (true);
  END IF;

  -- workout_templates policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view default templates' AND tablename = 'workout_templates') THEN
    CREATE POLICY "Users can view default templates" ON workout_templates
      FOR SELECT USING (is_default = true OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own templates' AND tablename = 'workout_templates') THEN
    CREATE POLICY "Users can create their own templates" ON workout_templates
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own templates' AND tablename = 'workout_templates') THEN
    CREATE POLICY "Users can update their own templates" ON workout_templates
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own templates' AND tablename = 'workout_templates') THEN
    CREATE POLICY "Users can delete their own templates" ON workout_templates
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- workouts policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own workouts' AND tablename = 'workouts') THEN
    CREATE POLICY "Users can view their own workouts" ON workouts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own workouts' AND tablename = 'workouts') THEN
    CREATE POLICY "Users can create their own workouts" ON workouts
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own workouts' AND tablename = 'workouts') THEN
    CREATE POLICY "Users can update their own workouts" ON workouts
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own workouts' AND tablename = 'workouts') THEN
    CREATE POLICY "Users can delete their own workouts" ON workouts
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- workout_exercises policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own workout exercises' AND tablename = 'workout_exercises') THEN
    CREATE POLICY "Users can view their own workout exercises" ON workout_exercises
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM workouts
          WHERE workouts.id = workout_exercises.workout_id
          AND workouts.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own workout exercises' AND tablename = 'workout_exercises') THEN
    CREATE POLICY "Users can create their own workout exercises" ON workout_exercises
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM workouts
          WHERE workouts.id = workout_exercises.workout_id
          AND workouts.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own workout exercises' AND tablename = 'workout_exercises') THEN
    CREATE POLICY "Users can update their own workout exercises" ON workout_exercises
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM workouts
          WHERE workouts.id = workout_exercises.workout_id
          AND workouts.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own workout exercises' AND tablename = 'workout_exercises') THEN
    CREATE POLICY "Users can delete their own workout exercises" ON workout_exercises
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM workouts
          WHERE workouts.id = workout_exercises.workout_id
          AND workouts.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 5. NEW TABLE: User workout profiles (preferences and goals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- user preferences
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  primary_goal TEXT CHECK (primary_goal IN ('strength', 'hypertrophy', 'endurance', 'general_fitness')) DEFAULT 'general_fitness',
  training_frequency INT CHECK (training_frequency BETWEEN 1 AND 7) DEFAULT 3,
  session_duration INT DEFAULT 60,          -- minutes
  available_equipment TEXT[] DEFAULT ARRAY['bodyweight'],
  training_location TEXT CHECK (training_location IN ('gym', 'home', 'both')) DEFAULT 'both',

  -- physical stats (optional)
  weight DECIMAL(5, 2),                     -- kg
  height DECIMAL(5, 2),                     -- cm
  age INT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),

  -- timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_profiles_user_id ON workout_profiles(user_id);

-- ============================================================================
-- 6. NEW TABLE: Personal records (track PRs for each exercise)
-- ============================================================================
CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

  -- record types
  record_type TEXT CHECK (record_type IN ('1rm', 'max_reps', 'max_volume', 'max_weight')) NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  unit TEXT,                                -- 'kg', 'lbs', 'reps', etc.

  -- context
  achieved_at TIMESTAMPTZ NOT NULL,
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE SET NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, exercise_id, record_type)
);

CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_achieved_at ON personal_records(achieved_at DESC);

-- ============================================================================
-- 7. NEW TABLE: Exercise alternatives (for when equipment unavailable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

  similarity_score DECIMAL(3, 2),           -- 0.00-1.00
  reason TEXT,                              -- why this is a good alternative

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(primary_exercise_id, alternative_exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_primary ON exercise_alternatives(primary_exercise_id);

-- ============================================================================
-- Row Level Security (RLS) - Only for NEW tables
-- ============================================================================

-- enable rls on new tables
ALTER TABLE workout_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_alternatives ENABLE ROW LEVEL SECURITY;

-- workout_profiles policies
CREATE POLICY "Users can view their own profile" ON workout_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON workout_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON workout_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- personal_records policies
CREATE POLICY "Users can view their own personal records" ON personal_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personal records" ON personal_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personal records" ON personal_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personal records" ON personal_records
  FOR DELETE USING (auth.uid() = user_id);

-- exercise_alternatives policies (public read)
CREATE POLICY "Anyone can view exercise alternatives" ON exercise_alternatives
  FOR SELECT USING (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- function to calculate estimated 1RM (Epley formula)
CREATE OR REPLACE FUNCTION calculate_estimated_1rm(weight DECIMAL, reps INT)
RETURNS DECIMAL AS $$
BEGIN
  IF reps = 1 THEN
    RETURN weight;
  ELSIF reps <= 12 THEN
    -- epley formula: weight * (1 + reps/30)
    RETURN weight * (1 + reps::DECIMAL / 30);
  ELSE
    -- for high reps, return weight as it's not accurate for 1RM estimation
    RETURN weight;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- function to calculate workout volume from exercise logs
CREATE OR REPLACE FUNCTION calculate_workout_volume(exercise_sets JSONB)
RETURNS DECIMAL AS $$
DECLARE
  total_volume DECIMAL := 0;
  set_data JSONB;
BEGIN
  FOR set_data IN SELECT * FROM jsonb_array_elements(exercise_sets)
  LOOP
    total_volume := total_volume +
      COALESCE((set_data->>'reps')::INT, 0) *
      COALESCE((set_data->>'weight')::DECIMAL, 0);
  END LOOP;
  RETURN total_volume;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Seed Data - Update existing exercises and add new features
-- ============================================================================

-- seed common exercises (only if not exist)
INSERT INTO exercises (name, category, muscle_groups, equipment, difficulty, instructions, tips, description, is_compound, force_type) VALUES
  ('Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], 'barbell', 'intermediate', 'lie on bench, lower bar to chest, press up', 'keep shoulders back and down', 'compound chest exercise for building pressing strength', true, 'push'),
  ('Squat', 'strength', ARRAY['legs', 'glutes', 'core'], 'barbell', 'intermediate', 'bar on back, squat down keeping chest up, drive through heels', 'knees track over toes', 'fundamental lower body compound movement', true, 'push'),
  ('Deadlift', 'strength', ARRAY['back', 'legs', 'core'], 'barbell', 'advanced', 'hinge at hips, grip bar, drive through heels to stand', 'keep bar close to body', 'posterior chain compound exercise', true, 'pull'),
  ('Pull-ups', 'strength', ARRAY['back', 'biceps'], 'bodyweight', 'intermediate', 'hang from bar, pull chin over bar', 'engage lats before pulling', 'bodyweight back exercise', true, 'pull'),
  ('Push-ups', 'strength', ARRAY['chest', 'triceps', 'core'], 'bodyweight', 'beginner', 'plank position, lower chest to ground, push up', 'keep core tight', 'bodyweight chest exercise', true, 'push'),
  ('Dumbbell Row', 'strength', ARRAY['back', 'biceps'], 'dumbbell', 'beginner', 'hinge forward, row dumbbell to hip', 'keep back flat', 'unilateral back exercise', true, 'pull'),
  ('Shoulder Press', 'strength', ARRAY['shoulders', 'triceps'], 'dumbbell', 'beginner', 'press dumbbells overhead from shoulders', 'keep core tight', 'shoulder compound movement', true, 'push'),
  ('Lunges', 'strength', ARRAY['legs', 'glutes'], 'bodyweight', 'beginner', 'step forward, lower back knee to ground', 'keep front knee over ankle', 'unilateral leg exercise', true, 'push'),
  ('Plank', 'strength', ARRAY['core'], 'bodyweight', 'beginner', 'hold push-up position on forearms', 'don''t let hips sag', 'core stability exercise', false, 'static'),
  ('Running', 'cardio', ARRAY['legs', 'cardiovascular'], null, 'beginner', 'steady state or interval running', 'warm up properly', 'cardiovascular exercise', false, 'dynamic'),
  ('Bicep Curls', 'strength', ARRAY['biceps'], 'dumbbell', 'beginner', 'curl dumbbells from sides to shoulders', 'keep elbows stationary', 'bicep isolation', false, 'pull'),
  ('Tricep Dips', 'strength', ARRAY['triceps'], 'bodyweight', 'beginner', 'lower body by bending elbows, push back up', 'full range of motion', 'tricep compound', true, 'push'),
  ('Leg Press', 'strength', ARRAY['legs', 'glutes'], 'machine', 'beginner', 'push platform away with feet', 'don''t lock out knees', 'quad machine exercise', true, 'push'),
  ('Lat Pulldown', 'strength', ARRAY['back', 'biceps'], 'machine', 'beginner', 'pull bar down to chest level', 'slight lean back', 'vertical pulling machine', true, 'pull'),
  ('Face Pulls', 'strength', ARRAY['shoulders', 'back'], 'cable', 'intermediate', 'pull rope towards face, elbows high', 'external rotation at end', 'rear delt and upper back', false, 'pull')
ON CONFLICT DO NOTHING;

-- update existing exercises if they exist
UPDATE exercises SET
  is_compound = true,
  force_type = 'push',
  description = COALESCE(description, 'compound chest exercise for building pressing strength')
WHERE name = 'Bench Press' AND description IS NULL;

UPDATE exercises SET is_compound = true, force_type = 'push' WHERE name = 'Squat' AND force_type IS NULL;
UPDATE exercises SET is_compound = true, force_type = 'pull' WHERE name = 'Deadlift' AND force_type IS NULL;
UPDATE exercises SET is_compound = true, force_type = 'pull' WHERE name = 'Pull-ups' AND force_type IS NULL;
UPDATE exercises SET is_compound = true, force_type = 'push' WHERE name = 'Push-ups' AND force_type IS NULL;
UPDATE exercises SET is_compound = true, force_type = 'pull' WHERE name = 'Dumbbell Row' AND force_type IS NULL;
UPDATE exercises SET is_compound = true, force_type = 'push' WHERE name = 'Shoulder Press' AND force_type IS NULL;
UPDATE exercises SET is_compound = true, force_type = 'push' WHERE name = 'Lunges' AND force_type IS NULL;
UPDATE exercises SET is_compound = false, force_type = 'static' WHERE name = 'Plank' AND force_type IS NULL;

-- seed default workout templates
INSERT INTO workout_templates (name, description, difficulty, duration_minutes, exercises, is_default, user_id, tags, target_goal) VALUES
  (
    'Push Day',
    'chest, shoulders, and triceps workout',
    'intermediate',
    60,
    jsonb_build_array(
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1),
        'sets', 4,
        'reps', '8-10',
        'rest', 120
      ),
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Shoulder Press' LIMIT 1),
        'sets', 3,
        'reps', '10-12',
        'rest', 90
      ),
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Push-ups' LIMIT 1),
        'sets', 3,
        'reps', '12-15',
        'rest', 60
      )
    ),
    true,
    null,
    ARRAY['push', 'upper-body', 'chest', 'shoulders', 'triceps'],
    'hypertrophy'
  ),
  (
    'Pull Day',
    'back and biceps workout',
    'intermediate',
    60,
    jsonb_build_array(
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Deadlift' LIMIT 1),
        'sets', 4,
        'reps', '6-8',
        'rest', 180
      ),
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Pull-ups' LIMIT 1),
        'sets', 3,
        'reps', '8-10',
        'rest', 120
      ),
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Dumbbell Row' LIMIT 1),
        'sets', 3,
        'reps', '10-12',
        'rest', 90
      )
    ),
    true,
    null,
    ARRAY['pull', 'upper-body', 'back', 'biceps'],
    'hypertrophy'
  ),
  (
    'Leg Day',
    'lower body strength workout',
    'intermediate',
    60,
    jsonb_build_array(
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Squat' LIMIT 1),
        'sets', 4,
        'reps', '8-10',
        'rest', 150
      ),
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Lunges' LIMIT 1),
        'sets', 3,
        'reps', '12-15',
        'rest', 90
      ),
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Leg Press' LIMIT 1),
        'sets', 3,
        'reps', '10-12',
        'rest', 90
      )
    ),
    true,
    null,
    ARRAY['legs', 'lower-body', 'quads', 'glutes'],
    'strength'
  ),
  (
    'Full Body Beginner',
    'complete beginner-friendly workout',
    'beginner',
    45,
    jsonb_build_array(
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Push-ups' LIMIT 1),
        'sets', 3,
        'reps', '10-12',
        'rest', 60
      ),
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Dumbbell Row' LIMIT 1),
        'sets', 3,
        'reps', '10-12',
        'rest', 60
      ),
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Lunges' LIMIT 1),
        'sets', 3,
        'reps', '10-12',
        'rest', 60
      ),
      jsonb_build_object(
        'exercise_id', (SELECT id FROM exercises WHERE name = 'Plank' LIMIT 1),
        'sets', 3,
        'reps', '30-60s',
        'rest', 60
      )
    ),
    true,
    null,
    ARRAY['full-body', 'beginner', 'home'],
    'general_fitness'
  )
ON CONFLICT DO NOTHING;

-- update existing workout templates
UPDATE workout_templates SET
  tags = ARRAY['push', 'upper-body', 'chest', 'shoulders', 'triceps'],
  target_goal = 'hypertrophy'
WHERE name = 'Push Day' AND tags IS NULL;

UPDATE workout_templates SET
  tags = ARRAY['pull', 'upper-body', 'back', 'biceps'],
  target_goal = 'hypertrophy'
WHERE name = 'Pull Day' AND tags IS NULL;

UPDATE workout_templates SET
  tags = ARRAY['legs', 'lower-body', 'quads', 'glutes'],
  target_goal = 'strength'
WHERE name = 'Leg Day' AND tags IS NULL;

UPDATE workout_templates SET
  tags = ARRAY['full-body', 'beginner', 'home'],
  target_goal = 'general_fitness'
WHERE name = 'Full Body Beginner' AND tags IS NULL;

-- seed exercise alternatives (only add if exercises exist)
INSERT INTO exercise_alternatives (primary_exercise_id, alternative_exercise_id, similarity_score, reason)
SELECT
  e1.id,
  e2.id,
  alt_data.similarity_score,
  alt_data.reason
FROM (VALUES
  ('Bench Press', 'Push-ups', 0.75, 'bodyweight alternative, same movement pattern'),
  ('Pull-ups', 'Lat Pulldown', 0.90, 'machine alternative for vertical pull'),
  ('Squat', 'Leg Press', 0.80, 'machine alternative for quad development'),
  ('Deadlift', 'Dumbbell Row', 0.70, 'rowing alternative when deadlift unavailable'),
  ('Shoulder Press', 'Push-ups', 0.65, 'bodyweight pressing alternative')
) AS alt_data(primary_name, alternative_name, similarity_score, reason)
JOIN exercises e1 ON e1.name = alt_data.primary_name
JOIN exercises e2 ON e2.name = alt_data.alternative_name
ON CONFLICT DO NOTHING;
