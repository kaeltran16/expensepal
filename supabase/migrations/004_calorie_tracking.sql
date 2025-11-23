-- Migration: Add calorie tracking tables
-- Description: Add meals, saved_foods, and calorie_goals tables for nutrition tracking

-- ============================================================================
-- 1. Meals table (main calorie tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Meal details
  name TEXT NOT NULL,                      -- e.g., "Phở bò from Phở 24"
  calories INTEGER NOT NULL,               -- Total calories
  protein DECIMAL(10, 2) DEFAULT 0,        -- Grams of protein
  carbs DECIMAL(10, 2) DEFAULT 0,          -- Grams of carbohydrates
  fat DECIMAL(10, 2) DEFAULT 0,            -- Grams of fat

  -- Meal time categorization
  meal_time TEXT DEFAULT 'other' CHECK (meal_time IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),

  -- When the meal was consumed
  meal_date TIMESTAMPTZ NOT NULL,

  -- Data source tracking
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'llm', 'usda', 'saved', 'email')),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),  -- LLM confidence level

  -- Link to expense (if meal came from food purchase)
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

  -- Optional notes and reasoning
  notes TEXT,
  llm_reasoning TEXT,                      -- Why the LLM estimated these values

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meals_meal_date ON meals(meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_meals_meal_time ON meals(meal_time);
CREATE INDEX IF NOT EXISTS idx_meals_source ON meals(source);
CREATE INDEX IF NOT EXISTS idx_meals_expense_id ON meals(expense_id);

-- ============================================================================
-- 2. Saved foods (personal food database)
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Food details
  name TEXT NOT NULL UNIQUE,               -- e.g., "Phở bò (my usual portion)"
  calories INTEGER NOT NULL,
  protein DECIMAL(10, 2) DEFAULT 0,
  carbs DECIMAL(10, 2) DEFAULT 0,
  fat DECIMAL(10, 2) DEFAULT 0,

  -- Source of data
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'llm', 'usda')),

  -- Usage tracking (for smart suggestions)
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Optional metadata
  notes TEXT,
  portion_description TEXT,                -- e.g., "Large bowl", "1 cup"

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_saved_foods_name ON saved_foods(name);
CREATE INDEX IF NOT EXISTS idx_saved_foods_use_count ON saved_foods(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_saved_foods_favorite ON saved_foods(is_favorite) WHERE is_favorite = true;

-- ============================================================================
-- 3. Calorie goals (daily targets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS calorie_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Daily targets
  daily_calories INTEGER NOT NULL,
  protein_target DECIMAL(10, 2),           -- Grams per day
  carbs_target DECIMAL(10, 2),             -- Grams per day
  fat_target DECIMAL(10, 2),               -- Grams per day

  -- When this goal is active
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,                           -- NULL means ongoing

  -- Goal metadata
  goal_type TEXT DEFAULT 'maintenance' CHECK (goal_type IN ('weight_loss', 'weight_gain', 'maintenance', 'custom')),
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding active goal
CREATE INDEX IF NOT EXISTS idx_calorie_goals_active ON calorie_goals(start_date DESC, end_date)
  WHERE end_date IS NULL;

-- ============================================================================
-- 4. Update triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for meals table
DROP TRIGGER IF EXISTS update_meals_updated_at ON meals;
CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for saved_foods table
DROP TRIGGER IF EXISTS update_saved_foods_updated_at ON saved_foods;
CREATE TRIGGER update_saved_foods_updated_at
  BEFORE UPDATE ON saved_foods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Row Level Security (RLS) - Open access for now
-- ============================================================================
-- Note: When authentication is added, these policies should be updated

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on meals" ON meals
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE saved_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on saved_foods" ON saved_foods
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE calorie_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on calorie_goals" ON calorie_goals
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. Seed data - Common Vietnamese foods
-- ============================================================================
INSERT INTO saved_foods (name, calories, protein, carbs, fat, source, is_favorite, notes) VALUES
  ('Phở bò (medium bowl)', 450, 20, 65, 12, 'manual', true, 'Typical portion with standard beef'),
  ('Bánh mì thịt', 400, 15, 50, 18, 'manual', true, 'Standard street vendor size'),
  ('Cơm tấm sườn', 550, 25, 70, 15, 'manual', true, 'Broken rice with pork chop'),
  ('Bún bò Huế', 500, 22, 60, 18, 'manual', false, 'Spicy beef noodle soup'),
  ('Cà phê sữa đá', 150, 2, 24, 5, 'manual', true, 'Vietnamese iced coffee with condensed milk'),
  ('Gỏi cuốn (2 rolls)', 150, 8, 20, 4, 'manual', false, 'Fresh spring rolls'),
  ('Cơm chiên dương châu', 600, 18, 75, 22, 'manual', false, 'Fried rice'),
  ('Bánh xèo', 350, 12, 45, 15, 'manual', false, 'Vietnamese savory crepe')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. Default calorie goal
-- ============================================================================
INSERT INTO calorie_goals (daily_calories, protein_target, carbs_target, fat_target, goal_type, notes)
VALUES (2000, 100, 250, 65, 'maintenance', 'Default maintenance goal')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration complete
-- ============================================================================
COMMENT ON TABLE meals IS 'Daily meal logging with nutrition tracking';
COMMENT ON TABLE saved_foods IS 'Personal food database for quick logging';
COMMENT ON TABLE calorie_goals IS 'Daily calorie and macro targets';
