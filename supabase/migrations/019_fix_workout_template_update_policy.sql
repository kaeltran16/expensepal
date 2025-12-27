-- Fix workout_templates UPDATE policy to include WITH CHECK clause
-- The issue: UPDATE policies need both USING and WITH CHECK clauses

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can update their own templates" ON workout_templates;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "Users can update their own templates" ON workout_templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
