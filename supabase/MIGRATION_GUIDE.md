# Database Migration Guide

This guide explains how to set up and migrate your Supabase database for the expense tracker app.

## 📋 Table of Contents

1. [Fresh Installation](#fresh-installation)
2. [Migrating Existing Data](#migrating-existing-data)
3. [Manual Migration Steps](#manual-migration-steps)
4. [Rollback Instructions](#rollback-instructions)
5. [Troubleshooting](#troubleshooting)

---

## 🆕 Fresh Installation

If you're setting up the app for the first time with no existing data:

### Option 1: Using the Schema File (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/schema.sql`
4. Paste and run in the SQL Editor
5. Done! ✅

### Option 2: Using Migration Files

1. Go to **SQL Editor** in Supabase
2. Run `migrations/001_initial_schema.sql`
3. Verify tables were created:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

---

## 🔄 Migrating Existing Data

If you already have an expenses table with data and need to update the schema:

### Step 1: Backup Your Data

**Always backup before migrating!**

```sql
-- Create a backup table
CREATE TABLE expenses_backup AS
SELECT * FROM expenses;

-- Verify backup
SELECT COUNT(*) FROM expenses_backup;
```

### Step 2: Run the Migration

1. Go to **SQL Editor** in Supabase
2. Run `migrations/002_make_card_fields_optional.sql`
3. This will:
   - Remove NOT NULL constraints from card fields
   - Add default values
   - Update existing NULL values

### Step 3: Verify the Migration

```sql
-- Check table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'expenses'
ORDER BY ordinal_position;

-- Verify data integrity
SELECT COUNT(*) FROM expenses;
SELECT COUNT(*) FROM expenses WHERE card_number IS NULL;
SELECT COUNT(*) FROM expenses WHERE category IS NULL;
```

### Step 4: Test the App

1. Try creating a manual expense (should work without card info)
2. Sync an email (should populate card fields)
3. Check that existing expenses still display correctly

---

## 🛠️ Manual Migration Steps

If you prefer to run commands manually or need custom migration:

### Make Card Fields Optional

```sql
-- Remove NOT NULL constraints
ALTER TABLE expenses ALTER COLUMN card_number DROP NOT NULL;
ALTER TABLE expenses ALTER COLUMN cardholder DROP NOT NULL;
ALTER TABLE expenses ALTER COLUMN transaction_type DROP NOT NULL;

-- Add default values
ALTER TABLE expenses ALTER COLUMN transaction_type SET DEFAULT 'Expense';
ALTER TABLE expenses ALTER COLUMN category SET DEFAULT 'Other';
```

### Update Existing Data

```sql
-- Set defaults for NULL values
UPDATE expenses
SET transaction_type = 'Expense'
WHERE transaction_type IS NULL;

UPDATE expenses
SET category = 'Other'
WHERE category IS NULL OR category = '';
```

### Clean Up Manual Entries (Optional)

If you have manual entries with placeholder card data like "N/A":

```sql
-- Set card fields to NULL for manual entries
UPDATE expenses
SET
  card_number = NULL,
  cardholder = NULL
WHERE
  source = 'manual'
  AND (card_number = 'N/A' OR card_number = '');
```

---

## ⏮️ Rollback Instructions

If something goes wrong, you can rollback:

### Restore from Backup

```sql
-- Drop current table
DROP TABLE expenses;

-- Restore from backup
CREATE TABLE expenses AS
SELECT * FROM expenses_backup;

-- Recreate indexes
CREATE INDEX idx_expenses_transaction_date ON expenses(transaction_date DESC);
CREATE INDEX idx_expenses_merchant ON expenses(merchant);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_source ON expenses(source);

-- Recreate trigger
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Re-enable RLS and Policies

```sql
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on expenses" ON expenses
    FOR ALL USING (true) WITH CHECK (true);
```

---

## 🔍 Troubleshooting

### Error: "column must be non-null"

If you get this error when creating manual expenses:

```sql
-- Check which columns still have NOT NULL constraints
SELECT
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
  AND is_nullable = 'NO';
```

Then remove the constraint:
```sql
ALTER TABLE expenses ALTER COLUMN [column_name] DROP NOT NULL;
```

### Error: "violates check constraint"

If the source field has an invalid value:

```sql
-- Check constraint definition
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%expenses%';

-- Fix invalid sources
UPDATE expenses
SET source = 'manual'
WHERE source NOT IN ('manual', 'email');
```

### Missing Indexes

If queries are slow after migration:

```sql
-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_date ON expenses(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_merchant ON expenses(merchant);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source);
```

### Category Names Changed

If you used "Food & Dining" before but now use "Food":

```sql
-- Update old category names to new format
UPDATE expenses SET category = 'Food' WHERE category = 'Food & Dining';
UPDATE expenses SET category = 'Transport' WHERE category = 'Transportation';
UPDATE expenses SET category = 'Health' WHERE category = 'Healthcare';
UPDATE expenses SET category = 'Bills' WHERE category = 'Bills & Utilities';
```

---

## 🔒 Best Practices

1. **Always backup before migrations**
   ```sql
   CREATE TABLE expenses_backup_YYYYMMDD AS SELECT * FROM expenses;
   ```

2. **Test in development first**
   - Create a test Supabase project
   - Run migration there first
   - Verify everything works

3. **Run migrations during low-traffic times**
   - Migrations can lock tables briefly
   - Best to run when no one is using the app

4. **Keep migration history**
   - Number migrations: `001_`, `002_`, etc.
   - Document what each migration does
   - Never delete old migration files

5. **Use transactions for complex migrations**
   ```sql
   BEGIN;
   -- Your migration commands
   COMMIT;
   -- Or ROLLBACK if something fails
   ```

---

## 📊 Verifying Schema

After migration, your schema should match:

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY,
    card_number TEXT,              -- ✅ Nullable
    cardholder TEXT,               -- ✅ Nullable
    transaction_type TEXT,         -- ✅ Nullable, defaults to 'Expense'
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    transaction_date TIMESTAMPTZ NOT NULL,
    merchant TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    notes TEXT,
    source TEXT NOT NULL CHECK (source IN ('manual', 'email')),
    email_subject TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Next Steps

After successful migration:

1. ✅ Test creating manual expenses
2. ✅ Test email sync
3. ✅ Verify existing expenses display correctly
4. ✅ Update your `.env` with Supabase credentials
5. ✅ Deploy your app!

---

## 📞 Need Help?

If you encounter issues:

1. Check the Supabase logs in your dashboard
2. Verify your schema matches the expected structure
3. Check the app's console for API errors
4. Open an issue on GitHub with error details
