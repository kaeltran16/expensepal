# 📧 Multiple Email Accounts Setup

This guide explains how to monitor multiple email accounts for VIB transaction notifications.

## 🎯 Use Cases

1. **Multiple Personal Emails**: Monitor both your personal and work email
2. **Family Accounts**: Track expenses from multiple family members' emails
3. **Backup Accounts**: Ensure no transaction emails are missed

## 🔧 Configuration

### Step 1: Add Email Accounts to .env

Edit your `.env` file:

```env
# Primary Email Account (Required)
EMAIL_USER=john@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_TLS=true

# Secondary Email Account (Optional)
EMAIL_USER_2=jane@gmail.com
EMAIL_PASSWORD_2=qrstuvwxyzabcdef
EMAIL_HOST_2=imap.gmail.com
EMAIL_PORT_2=993
EMAIL_TLS_2=true
```

### Step 2: Generate App Passwords

For each Gmail account:

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Generate a unique app password for each account
3. Copy the 16-character password (remove spaces)
4. Add to your `.env` file

See [GMAIL_SETUP.md](GMAIL_SETUP.md) for detailed instructions.

### Step 3: Restart Your Server

```bash
# Stop the server (Ctrl+C)
npm run dev
```

### Step 4: Test the Sync

1. Open your app
2. Click the mail icon (top right)
3. Check the logs:

```
Syncing from 2 email account(s)...
Fetching from email account 1...
Fetching from email account 2...
Found 5 total expenses from all accounts
✓ Synced 5 expenses from 2 account(s)
```

## 📊 How It Works

**Parallel Syncing**:
- Both email accounts are checked simultaneously
- Faster than checking sequentially
- All expenses are combined and saved together

**Security**:
- Each account has its own credentials
- Both accounts only process emails from `info@card.vib.com.vn`
- Double validation on both accounts

**Deduplication**:
- The app doesn't automatically deduplicate
- If the same transaction email is in both accounts, it will be imported twice
- Manually delete duplicates if needed

## 🔍 Checking Status

The sync API now returns:

```json
{
  "message": "Synced 5 expenses from 2 account(s)",
  "count": 5,
  "failed": 0,
  "accounts": 2,
  "expenses": [...]
}
```

## ⚙️ Advanced: More Than 2 Accounts

To add a 3rd, 4th, or more email accounts, modify `lib/email-service.ts`:

```typescript
// Add in getEmailServices() function
if (process.env.EMAIL_USER_3 && process.env.EMAIL_PASSWORD_3) {
  emailServices.push(
    new EmailService({
      user: process.env.EMAIL_USER_3,
      password: process.env.EMAIL_PASSWORD_3,
      host: process.env.EMAIL_HOST_3 || 'imap.gmail.com',
      port: parseInt(process.env.EMAIL_PORT_3 || '993'),
      tls: process.env.EMAIL_TLS_3 === 'true',
    })
  )
}
```

Then add to `.env`:

```env
EMAIL_USER_3=account3@gmail.com
EMAIL_PASSWORD_3=your-app-password-3
```

## 🚨 Troubleshooting

### Only One Account Syncing

**Check:**
1. Both sets of credentials are in `.env`
2. Both app passwords are correct (no spaces)
3. Server was restarted after adding 2nd account

**Debug:**
```bash
# Check the logs when syncing
Syncing from X email account(s)...
```
If it says "1 email account(s)", the 2nd account isn't configured.

### Authentication Errors on 2nd Account

**Check:**
1. App password is correct
2. 2FA is enabled on the 2nd account
3. IMAP is enabled for the 2nd account

**Test individually:**
Temporarily remove the primary account credentials to test the 2nd account alone.

### Duplicate Expenses

If the same email is in both accounts:

1. The expense will be imported twice
2. Manually delete one copy
3. Consider using Gmail filters to route VIB emails to only one account

## 💡 Best Practices

1. **Use Different Accounts for Different Cards**
   - Personal card → Personal email
   - Work card → Work email

2. **Gmail Filters**
   - Set up filters to forward VIB emails to one account
   - Prevents duplicates

3. **Regular Cleanup**
   - Check for duplicate expenses periodically
   - Consider adding categories to distinguish sources

4. **Security**
   - Use unique app passwords for each account
   - Never share passwords between services
   - Revoke unused app passwords

## 🔄 Disabling an Account

To temporarily disable an account without deleting credentials:

**Option 1: Comment out in .env**
```env
# EMAIL_USER_2=jane@gmail.com
# EMAIL_PASSWORD_2=qrstuvwxyzabcdef
```

**Option 2: Empty the values**
```env
EMAIL_USER_2=
EMAIL_PASSWORD_2=
```

Restart the server - it will only use configured accounts.

## 📝 Example Scenarios

### Scenario 1: Personal + Spouse
```env
# Your account
EMAIL_USER=john@gmail.com
EMAIL_PASSWORD=your-password

# Spouse's account
EMAIL_USER_2=jane@gmail.com
EMAIL_PASSWORD_2=spouse-password
```

### Scenario 2: Primary + Backup
```env
# Primary Gmail
EMAIL_USER=primary@gmail.com
EMAIL_PASSWORD=primary-password

# Backup Yahoo (if VIB also sends there)
EMAIL_USER_2=backup@yahoo.com
EMAIL_PASSWORD_2=backup-password
EMAIL_HOST_2=imap.mail.yahoo.com
```

---

Need help? Check the [main documentation](../README.md) or open an issue!
