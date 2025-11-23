-- Add unique constraint to prevent duplicate expenses from email sync
-- This prevents the same transaction from being imported multiple times

-- For email-sourced expenses, we use:
-- - user_id (which user owns this expense)
-- - merchant (store name)
-- - amount (transaction amount)
-- - transaction_date (when transaction occurred)
-- - source (must be 'email')
-- This combination should uniquely identify a transaction per user

CREATE UNIQUE INDEX idx_expenses_email_unique
ON expenses (user_id, merchant, amount, transaction_date, source)
WHERE source = 'email';

-- Note: This only applies to email-sourced expenses
-- Manual entries can have duplicates (user might enter the same thing twice intentionally)
