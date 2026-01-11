-- Migration: Fix is_default column to default to false for user templates
-- Created: 2026-01-10
-- Description: Changes the default value of is_default from true to false
--              and updates existing user-created templates

-- Step 1: Change the default value for future inserts
ALTER TABLE workout_templates
  ALTER COLUMN is_default SET DEFAULT false;

-- Step 2: Update all existing user-created templates (non-system templates)
-- System templates have user_id = NULL, user templates have user_id set
UPDATE workout_templates
SET is_default = false
WHERE user_id IS NOT NULL;

-- Step 3: Ensure system templates remain marked as default
UPDATE workout_templates
SET is_default = true
WHERE user_id IS NULL;

-- Verify the changes
DO $$
DECLARE
  user_template_count INT;
  system_template_count INT;
BEGIN
  SELECT COUNT(*) INTO user_template_count FROM workout_templates WHERE user_id IS NOT NULL AND is_default = false;
  SELECT COUNT(*) INTO system_template_count FROM workout_templates WHERE user_id IS NULL AND is_default = true;

  RAISE NOTICE 'Migration complete: % user templates set to is_default=false, % system templates remain is_default=true',
    user_template_count, system_template_count;
END $$;
