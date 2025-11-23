# Duplicate Detection for Email Sync

## Problem

Currently, the email sync does NOT detect duplicates. If you sync the same emails multiple times, they'll create duplicate expense entries in the database.

## Solution

A unique constraint that prevents duplicate email-sourced expenses based on:
- **Merchant** - Store/restaurant name
- **Amount** - Transaction amount
- **Transaction Date** - When the transaction occurred
- **Source** - Must be 'email'

This combination uniquely identifies an email transaction.

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Click **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/001_add_duplicate_detection.sql`
5. Click **Run**

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

## Testing

After applying the migration:

1. **Mark some Grab/VIB emails as unread** in your inbox
2. **Sync emails** in the app
3. **Check the logs** - you should see:
   ```
   ✓ Successfully inserted expense with ID: abc-123
   ```
4. **Sync again** (without marking emails as unread)
5. **Check the logs** - you should now see:
   ```
   Duplicate expense detected (already exists in database)
   Duplicates skipped: X
   ```

## What Counts as a Duplicate?

An expense is considered a duplicate if ALL of these match:
- Same merchant name
- Same amount
- Same transaction date/time
- Source is 'email'

## Manual Entries

This constraint only applies to email-sourced expenses. Manual entries can have duplicates (you might legitimately enter the same coffee shop purchase twice in one day).

## Edge Cases

### Same merchant, same amount, different times
- **Not a duplicate** - Transaction times differ

### Same merchant, same time, different amounts
- **Not a duplicate** - Amounts differ

### Two purchases at same merchant within same minute
- **IS a duplicate** - All fields match
- This is correct behavior - banks don't process two transactions in the same minute

## Troubleshooting

### Migration fails with "relation already exists"
The index is already created. Check with:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'expenses';
```

### Still seeing duplicates
1. Check the migration was applied successfully
2. Check console logs for error messages
3. Verify the expense has `source = 'email'`
