-- Migration: Make card fields optional for personal expense tracking
-- Run this if you have existing data with NOT NULL constraints

-- Drop NOT NULL constraints on card fields
ALTER TABLE expenses
  ALTER COLUMN card_number DROP NOT NULL;

ALTER TABLE expenses
  ALTER COLUMN cardholder DROP NOT NULL;

ALTER TABLE expenses
  ALTER COLUMN transaction_type DROP NOT NULL;

-- Add default value for transaction_type if not set
ALTER TABLE expenses
  ALTER COLUMN transaction_type SET DEFAULT 'Expense';

-- Add default value for category if not set
ALTER TABLE expenses
  ALTER COLUMN category SET DEFAULT 'Other';

-- Update existing records that might have empty values
-- Set default transaction_type for any NULL values
UPDATE expenses
SET transaction_type = 'Expense'
WHERE transaction_type IS NULL;

-- Set default category for any NULL values
UPDATE expenses
SET category = 'Other'
WHERE category IS NULL;

-- For manual entries without card info, set to NULL or placeholder
-- This is optional - only run if you have manual entries with dummy data
-- UPDATE expenses
-- SET card_number = NULL, cardholder = NULL
-- WHERE source = 'manual' AND (card_number = 'N/A' OR card_number = '');

COMMENT ON COLUMN expenses.card_number IS 'Optional: Only populated from email notifications';
COMMENT ON COLUMN expenses.cardholder IS 'Optional: Only populated from email notifications';
COMMENT ON COLUMN expenses.transaction_type IS 'Transaction type, defaults to Expense';
COMMENT ON COLUMN expenses.merchant IS 'Description of what was purchased';
COMMENT ON COLUMN expenses.category IS 'Expense category (Food, Transport, etc)';
