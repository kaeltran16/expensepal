# Email Sync Setup Guide

## How It Works

Email-synced expenses are automatically associated with the **logged-in user** who triggers the sync. No manual configuration needed!

When you click "Sync Emails" in the app:
1. The system checks your login session
2. Gets your user ID automatically
3. Associates all parsed expenses with your account
4. Expenses appear in your expense list immediately

## Setup Steps

### Step 1: Apply Database Migration

If you haven't already, apply the duplicate detection migration:

**In Supabase SQL Editor:**

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_email_unique
ON expenses (user_id, merchant, amount, transaction_date, source)
WHERE source = 'email';
```

This prevents duplicate email imports per user.

### Step 2: Fix Existing Expenses (Optional)

If you already have email-synced expenses with `NULL` user_id, update them to your user ID:

```sql
-- First, find your user ID
SELECT id, email FROM auth.users;

-- Preview what will be updated
SELECT id, merchant, amount, transaction_date, user_id
FROM expenses
WHERE source = 'email' AND user_id IS NULL;

-- Update to your user ID (replace YOUR_USER_ID with the ID from the first query)
UPDATE expenses
SET user_id = 'YOUR_USER_ID_HERE'
WHERE source = 'email' AND user_id IS NULL;
```

### Step 3: Test

1. Mark a Grab or VIB email as **unread**
2. **Log in** to the app (must be authenticated)
3. Trigger **email sync** in the app
4. Check the logs:
   ```
   Associating expenses with user: a1b2c3d4-... (your-email@example.com)
   ✓ Successfully inserted expense with ID: ...
   ```
5. **Refresh the app** - expenses should now appear!

## Verification Checklist

After setup, verify these in order:

- [ ] You are **logged in** to the app
- [ ] Database migration applied (unique index exists)
- [ ] Sync logs show: `Associating expenses with user: ... (your-email@...)`
- [ ] Expenses inserted successfully (no RLS errors)
- [ ] Expenses appear in the app UI

## Troubleshooting

### Error: "Unauthorized. Please log in to sync emails."

**Problem:** Not logged in or session expired

**Solution:** Log in to the app and try syncing again

### Expenses still not showing

**Problem:** Database migration not applied or old expenses have NULL user_id

**Solution:**
1. Apply the migration (Step 1)
2. Update old expenses to your user ID (Step 2)

### RLS Policy Error

**Problem:** Using wrong Supabase client

**Solution:** The code already uses `supabaseAdmin` - ensure `SUPABASE_SERVICE_ROLE_KEY` is set

### Duplicate Key Error After Migration

**Problem:** Trying to re-import expenses that already exist

**Solution:** This is expected! The duplicate detection is working. Old expenses with `NULL` user_id are different from new ones with user_id set.

## Multi-User Support

✅ **Already supported!** Each user syncs emails to their own account automatically.

How it works:
1. User A logs in and syncs → expenses go to User A
2. User B logs in and syncs → expenses go to User B
3. Each user only sees their own expenses (RLS policy enforcement)

**Note:** The email configuration (`EMAIL_USER`, `EMAIL_PASSWORD`) is currently shared across all users. For true per-user email sync, you would need to:
- Store email credentials per user in the database (encrypted)
- Allow users to configure their own email accounts in settings
- Fetch credentials based on the logged-in user

## Environment Variable Reference

```bash
# Required for email sync
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Required for database access (backend operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: AI parsing (recommended for better accuracy)
OPENROUTER_API_KEY=your-openrouter-key
```

## Related Documentation

- `AI_EMAIL_PARSER.md` - AI parsing setup
- `DUPLICATE_DETECTION.md` - How duplicates are detected
- `.env.example` - All environment variables
