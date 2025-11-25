-- Add user_id to categories table for custom categories
-- This allows users to create their own categories alongside default ones

-- Add user_id column (nullable for default categories)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remove the UNIQUE constraint on name (since different users can have same category names)
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- Add composite unique constraint (user can't have duplicate category names)
-- Default categories (user_id IS NULL) must still be unique
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_unique
  ON categories (user_id, name)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS categories_default_name_unique
  ON categories (name)
  WHERE user_id IS NULL;

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories

-- 1. Everyone can view default categories (user_id IS NULL)
CREATE POLICY "Default categories are viewable by everyone"
  ON categories FOR SELECT
  USING (user_id IS NULL);

-- 2. Users can view their own custom categories
CREATE POLICY "Users can view own custom categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Authenticated users can create custom categories
CREATE POLICY "Users can create own custom categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Users can update their own custom categories
CREATE POLICY "Users can update own custom categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Users can delete their own custom categories
CREATE POLICY "Users can delete own custom categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at column for tracking changes
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Add comments
COMMENT ON COLUMN categories.user_id IS 'NULL for default categories, user ID for custom categories';
COMMENT ON TABLE categories IS 'Budget and expense categories - includes defaults (user_id=NULL) and user-created custom categories';
