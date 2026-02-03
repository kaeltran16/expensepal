-- Add frequency column to routine_templates
-- Supports three frequency types:
-- 1. Daily: {"type": "daily"}
-- 2. Specific days: {"type": "specific_days", "days": ["mon", "wed", "fri"]}
-- 3. Interval: {"type": "interval", "every_x_days": 2, "start_date": "2026-02-03"}

ALTER TABLE routine_templates
ADD COLUMN IF NOT EXISTS frequency jsonb DEFAULT '{"type": "daily"}'::jsonb;

-- Add check constraint for valid frequency types
ALTER TABLE routine_templates
ADD CONSTRAINT valid_frequency_type CHECK (
  frequency IS NULL OR
  frequency->>'type' IN ('daily', 'specific_days', 'interval')
);

-- Add index for querying by frequency type
CREATE INDEX IF NOT EXISTS idx_routine_templates_frequency_type
ON routine_templates ((frequency->>'type'));
