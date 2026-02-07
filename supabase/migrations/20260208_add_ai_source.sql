-- Add 'ai' as an allowed source for expenses and meals
ALTER TABLE expenses DROP CONSTRAINT expenses_source_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_source_check CHECK (source IN ('manual', 'email', 'ai'));

ALTER TABLE meals DROP CONSTRAINT meals_source_check;
ALTER TABLE meals ADD CONSTRAINT meals_source_check CHECK (source IN ('manual', 'llm', 'usda', 'saved', 'email', 'ai'));
