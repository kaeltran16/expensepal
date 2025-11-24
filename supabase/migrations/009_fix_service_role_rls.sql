-- Migration: Fix RLS for service role on calorie tables
-- Description: Allow service role (supabaseAdmin) to insert meals from email sync

-- The issue: When using supabaseAdmin client for email sync, auth.uid() is NULL
-- This causes the INSERT policy to fail even though we're providing user_id
-- Solution: Add policies that allow service role to bypass RLS checks

-- ============================================================================
-- 1. Add service role bypass policies for MEALS table
-- ============================================================================

-- Allow service role to insert meals (for email sync automation)
CREATE POLICY "Service role can insert meals"
    ON meals FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Allow service role to update meals (for corrections)
CREATE POLICY "Service role can update meals"
    ON meals FOR UPDATE
    TO service_role
    USING (true);

-- Allow service role to delete meals (for cleanup)
CREATE POLICY "Service role can delete meals"
    ON meals FOR DELETE
    TO service_role
    USING (true);

-- Allow service role to select meals (for queries)
CREATE POLICY "Service role can select meals"
    ON meals FOR SELECT
    TO service_role
    USING (true);

-- ============================================================================
-- 2. Add service role bypass policies for SAVED_FOODS table
-- ============================================================================

-- Allow service role to manage saved_foods (for auto-saving LLM estimates)
CREATE POLICY "Service role can insert saved_foods"
    ON saved_foods FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update saved_foods"
    ON saved_foods FOR UPDATE
    TO service_role
    USING (true);

CREATE POLICY "Service role can select saved_foods"
    ON saved_foods FOR SELECT
    TO service_role
    USING (true);

-- ============================================================================
-- Migration complete
-- ============================================================================

COMMENT ON POLICY "Service role can insert meals" ON meals IS 
  'Allows email sync service to automatically create meal entries';
COMMENT ON POLICY "Service role can insert saved_foods" ON saved_foods IS 
  'Allows calorie estimator to cache LLM results';
