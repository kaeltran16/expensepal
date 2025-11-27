-- ============================================================================
-- Cleanup Script: Remove Duplicate Expenses and Email UIDs
-- ============================================================================
-- Run this in your Supabase SQL Editor

-- Step 1: Check current duplicate count
-- ============================================================================
SELECT 'Current duplicate expenses:' as status;

SELECT merchant, amount, transaction_date, currency, COUNT(*) as count
FROM expenses
WHERE source = 'email'
GROUP BY merchant, amount, transaction_date, currency
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- Step 2: Delete duplicate expenses (keep oldest for each unique transaction)
-- ============================================================================
SELECT 'Deleting duplicate expenses...' as status;

DELETE FROM expenses
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, merchant, amount, transaction_date, currency
        ORDER BY created_at ASC  -- keep the oldest one
      ) as rn
    FROM expenses
    WHERE source = 'email'
  ) t
  WHERE rn > 1
);

-- Step 3: Check duplicate processed_emails
-- ============================================================================
SELECT 'Current duplicate email UIDs:' as status;

SELECT email_account, email_uid, COUNT(*) as count
FROM processed_emails
GROUP BY email_account, email_uid
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- Step 4: Delete duplicate processed_emails (keep oldest for each UID)
-- ============================================================================
SELECT 'Deleting duplicate email UIDs...' as status;

DELETE FROM processed_emails
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, email_account, email_uid
        ORDER BY processed_at ASC  -- keep the oldest one
      ) as rn
    FROM processed_emails
  ) t
  WHERE rn > 1
);

-- Step 5: Add unique constraint to prevent future duplicates
-- ============================================================================
SELECT 'Adding unique constraint to expenses table...' as status;

-- First check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_expense_transaction'
  ) THEN
    ALTER TABLE expenses
    ADD CONSTRAINT unique_expense_transaction
    UNIQUE (user_id, merchant, amount, transaction_date, currency);

    RAISE NOTICE 'Unique constraint added successfully';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- Step 6: Verify cleanup
-- ============================================================================
SELECT 'Verification: Remaining duplicates' as status;

SELECT merchant, amount, transaction_date, COUNT(*) as count
FROM expenses
WHERE source = 'email'
GROUP BY merchant, amount, transaction_date, currency
HAVING COUNT(*) > 1;

SELECT 'If no rows returned above, cleanup was successful!' as status;

-- Step 7: Show final statistics
-- ============================================================================
SELECT
  'Total expenses from email' as metric,
  COUNT(*) as count
FROM expenses
WHERE source = 'email';

SELECT
  'Total processed email UIDs' as metric,
  COUNT(*) as count
FROM processed_emails;

SELECT
  'Unique expense transactions' as metric,
  COUNT(DISTINCT (merchant, amount, transaction_date, currency)) as count
FROM expenses
WHERE source = 'email';
