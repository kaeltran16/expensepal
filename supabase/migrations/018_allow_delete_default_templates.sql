-- Allow users to delete default templates (system templates)
-- This migration updates the delete policy to allow deletion of templates
-- that are either owned by the user OR are default templates

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their own templates" ON workout_templates;

-- Create a new policy that allows deletion of user's own templates OR default templates
CREATE POLICY "Users can delete their own and default templates" ON workout_templates
  FOR DELETE USING (
    auth.uid() = user_id OR
    (is_default = true AND user_id IS NULL)
  );
