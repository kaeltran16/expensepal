-- Migration: Add user authentication support
-- This migration adds user_id columns to all tables and updates RLS policies

-- Add user_id column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to budgets table
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to savings_goals table
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to push_subscriptions table
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes on user_id columns for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Update unique constraint on budgets to include user_id
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_month_key;
ALTER TABLE budgets ADD CONSTRAINT budgets_user_category_month_key UNIQUE(user_id, category, month);

-- Update unique constraint on push_subscriptions to include user_id
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_key;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_endpoint_key UNIQUE(user_id, endpoint);

-- Categories table remains shared (no user_id) as it's a global reference table

-- ============================================
-- UPDATE RLS POLICIES
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Allow all operations on expenses" ON expenses;
DROP POLICY IF EXISTS "Enable read access for all users" ON budgets;
DROP POLICY IF EXISTS "Enable insert for all users" ON budgets;
DROP POLICY IF EXISTS "Enable update for all users" ON budgets;
DROP POLICY IF EXISTS "Enable delete for all users" ON budgets;
DROP POLICY IF EXISTS "Enable read access for all users" ON savings_goals;
DROP POLICY IF EXISTS "Enable insert for all users" ON savings_goals;
DROP POLICY IF EXISTS "Enable update for all users" ON savings_goals;
DROP POLICY IF EXISTS "Enable delete for all users" ON savings_goals;
DROP POLICY IF EXISTS "Allow all operations on push_subscriptions" ON push_subscriptions;

-- EXPENSES: User can only see and manage their own expenses
CREATE POLICY "Users can view their own expenses"
    ON expenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
    ON expenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
    ON expenses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
    ON expenses FOR DELETE
    USING (auth.uid() = user_id);

-- BUDGETS: User can only see and manage their own budgets
CREATE POLICY "Users can view their own budgets"
    ON budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
    ON budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
    ON budgets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
    ON budgets FOR DELETE
    USING (auth.uid() = user_id);

-- SAVINGS_GOALS: User can only see and manage their own goals
CREATE POLICY "Users can view their own savings goals"
    ON savings_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings goals"
    ON savings_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals"
    ON savings_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals"
    ON savings_goals FOR DELETE
    USING (auth.uid() = user_id);

-- PUSH_SUBSCRIPTIONS: User can only see and manage their own subscriptions
CREATE POLICY "Users can view their own push subscriptions"
    ON push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
    ON push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
    ON push_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
    ON push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- CATEGORIES: Keep as shared resource (all users can read, only admins can modify)
-- Keep the existing policy or update it
CREATE POLICY "Anyone can view categories"
    ON categories FOR SELECT
    USING (true);

-- Note: For production, you might want to restrict category modifications
-- For now, allow authenticated users to suggest categories
CREATE POLICY "Authenticated users can insert categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
