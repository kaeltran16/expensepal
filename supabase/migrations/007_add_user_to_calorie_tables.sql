-- Migration: Add user_id to calorie tracking tables
-- Description: Add user authentication support for meals, saved_foods, and calorie_goals

-- ============================================================================
-- 1. Add user_id columns
-- ============================================================================

-- Add user_id to meals table
ALTER TABLE meals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to saved_foods table
ALTER TABLE saved_foods ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to calorie_goals table
ALTER TABLE calorie_goals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_foods_user_id ON saved_foods(user_id);
CREATE INDEX IF NOT EXISTS idx_calorie_goals_user_id ON calorie_goals(user_id);

-- ============================================================================
-- 3. Update unique constraints to include user_id
-- ============================================================================

-- saved_foods: name should be unique per user (not globally)
ALTER TABLE saved_foods DROP CONSTRAINT IF EXISTS saved_foods_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_foods_user_name ON saved_foods(user_id, name);

-- ============================================================================
-- 4. Update Row Level Security policies
-- ============================================================================

-- Drop old open policies
DROP POLICY IF EXISTS "Allow all operations on meals" ON meals;
DROP POLICY IF EXISTS "Allow all operations on saved_foods" ON saved_foods;
DROP POLICY IF EXISTS "Allow all operations on calorie_goals" ON calorie_goals;

-- MEALS: Users can only see and manage their own meals
CREATE POLICY "Users can view their own meals"
    ON meals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meals"
    ON meals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meals"
    ON meals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meals"
    ON meals FOR DELETE
    USING (auth.uid() = user_id);

-- SAVED_FOODS: Users can only see and manage their own saved foods
CREATE POLICY "Users can view their own saved_foods"
    ON saved_foods FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved_foods"
    ON saved_foods FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved_foods"
    ON saved_foods FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved_foods"
    ON saved_foods FOR DELETE
    USING (auth.uid() = user_id);

-- CALORIE_GOALS: Users can only see and manage their own calorie goals
CREATE POLICY "Users can view their own calorie_goals"
    ON calorie_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calorie_goals"
    ON calorie_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calorie_goals"
    ON calorie_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calorie_goals"
    ON calorie_goals FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- Migration complete
-- ============================================================================
