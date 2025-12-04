-- Add unique constraint on exercises.name for upsert support
-- This allows the import script to update existing exercises rather than fail on duplicates

-- First, remove any duplicates if they exist (keep the first one)
DELETE FROM exercises a USING exercises b
WHERE a.id > b.id 
  AND a.name = b.name;

-- Add unique constraint
ALTER TABLE exercises 
ADD CONSTRAINT exercises_name_unique UNIQUE (name);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);

COMMENT ON CONSTRAINT exercises_name_unique ON exercises IS 
  'Ensures exercise names are unique for upsert operations during data imports';
