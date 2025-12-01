-- Migration: Add workout tracking system
-- Description: Add exercises, workout_templates, workouts, and workout_exercises tables

-- ============================================================================
-- 1. Exercises table (master exercise library)
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

  -- timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);

-- ============================================================================
-- 2. Workout templates (pre-built workout plans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- template details
  name TEXT NOT NULL,                     -- e.g., 'Push Day', 'Pull Day'
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER,               -- estimated duration

  -- exercise plan stored as jsonb
  -- format: [{ exercise_id: uuid, sets: 3, reps: '8-12', rest: 90 }]
  exercises JSONB NOT NULL,

  -- template ownership
  is_default BOOLEAN DEFAULT true,        -- system templates vs user-created
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- null for system templates

  -- timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates(user_id);

-- ============================================================================
-- 3. Workouts table (user's logged workout sessions)
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

  -- timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date DESC);

-- trigger for updated_at
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Workout exercises (exercises performed in a workout session)
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

  -- timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- enable rls
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- exercises policies (public read)
CREATE POLICY "Anyone can view exercises" ON exercises
  FOR SELECT USING (true);

-- workout_templates policies
CREATE POLICY "Users can view default templates" ON workout_templates
  FOR SELECT USING (is_default = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" ON workout_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON workout_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON workout_templates
  FOR DELETE USING (auth.uid() = user_id);

-- workouts policies
CREATE POLICY "Users can view their own workouts" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" ON workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts" ON workouts
  FOR DELETE USING (auth.uid() = user_id);

-- workout_exercises policies (access through parent workout)
CREATE POLICY "Users can view their own workout exercises" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own workout exercises" ON workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own workout exercises" ON workout_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own workout exercises" ON workout_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Seed data
-- ============================================================================

-- seed common exercises
INSERT INTO exercises (name, category, muscle_groups, equipment, difficulty, instructions) VALUES
  ('Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], 'barbell', 'intermediate', 'lie on bench, lower bar to chest, press up'),
  ('Squat', 'strength', ARRAY['legs', 'glutes', 'core'], 'barbell', 'intermediate', 'bar on back, squat down keeping chest up, drive through heels'),
  ('Deadlift', 'strength', ARRAY['back', 'legs', 'core'], 'barbell', 'advanced', 'hinge at hips, grip bar, drive through heels to stand'),
  ('Pull-ups', 'strength', ARRAY['back', 'biceps'], 'bodyweight', 'intermediate', 'hang from bar, pull chin over bar'),
  ('Push-ups', 'strength', ARRAY['chest', 'triceps', 'core'], 'bodyweight', 'beginner', 'plank position, lower chest to ground, push up'),
  ('Dumbbell Row', 'strength', ARRAY['back', 'biceps'], 'dumbbell', 'beginner', 'hinge forward, row dumbbell to hip'),
  ('Shoulder Press', 'strength', ARRAY['shoulders', 'triceps'], 'dumbbell', 'beginner', 'press dumbbells overhead from shoulders'),
  ('Lunges', 'strength', ARRAY['legs', 'glutes'], 'bodyweight', 'beginner', 'step forward, lower back knee to ground'),
  ('Plank', 'strength', ARRAY['core'], 'bodyweight', 'beginner', 'hold push-up position on forearms'),
  ('Running', 'cardio', ARRAY['legs', 'cardiovascular'], null, 'beginner', 'steady state or interval running'),
  ('Bicep Curls', 'strength', ARRAY['biceps'], 'dumbbell', 'beginner', 'curl dumbbells from sides to shoulders'),
  ('Tricep Dips', 'strength', ARRAY['triceps'], 'bodyweight', 'beginner', 'lower body by bending elbows, push back up'),
  ('Leg Press', 'strength', ARRAY['legs', 'glutes'], 'machine', 'beginner', 'push platform away with feet'),
  ('Lat Pulldown', 'strength', ARRAY['back', 'biceps'], 'machine', 'beginner', 'pull bar down to chest level'),
  ('Face Pulls', 'strength', ARRAY['shoulders', 'back'], 'cable', 'intermediate', 'pull rope towards face, elbows high')
ON CONFLICT DO NOTHING;

-- seed default workout templates
INSERT INTO workout_templates (name, description, difficulty, duration_minutes, exercises, is_default, user_id) VALUES
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
    null
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
    null
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
    null
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
    null
  )
ON CONFLICT DO NOTHING;
