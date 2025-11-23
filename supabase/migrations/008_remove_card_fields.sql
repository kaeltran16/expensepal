-- Migration: Remove card_number and cardholder fields
-- These fields are no longer needed for expense tracking

-- Remove card_number column from expenses table
ALTER TABLE expenses DROP COLUMN IF EXISTS card_number;

-- Remove cardholder column from expenses table
ALTER TABLE expenses DROP COLUMN IF EXISTS cardholder;
