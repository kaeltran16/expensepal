# 📧 Gmail Setup Guide for Email Sync

This guide explains how to set up Gmail to work with the expense tracker's email sync feature.

## ⚠️ Common Error

```
IMAP error: Error: Invalid credentials (Failure)
textCode: 'AUTHENTICATIONFAILED'
```

This means you're using your regular Gmail password instead of an App Password.

---

## 🔐 Step-by-Step Setup

### Step 1: Enable 2-Factor Authentication

Gmail App Passwords require 2FA to be enabled first.

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the prompts to set up 2FA (use phone, authenticator app, etc.)
4. Complete the setup

### Step 2: Generate an App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Or search "Google App Passwords" in Google

2. You might need to sign in again

3. Click **Select app** dropdown:
   - Choose "Mail" or "Other (Custom name)"
   - If "Other", type: "Expense Tracker"

4. Click **Select device** dropdown:
   - Choose your device or "Other"
   - If "Other", type: "Expense Tracker App"

5. Click **Generate**

6. Google will show a 16-character password like: `abcd efgh ijkl mnop`

7. **Copy this password immediately** - you won't see it again!

### Step 3: Configure Your .env File

1. Open your `.env` file in the project root

2. Add your Gmail credentials:

```env
# Email Configuration
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop    # <- App Password (no spaces!)
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_TLS=true
```

**Important:**
- Remove all spaces from the App Password
- `abcd efgh ijkl mnop` becomes `abcdefghijklmnop`
- Use your full Gmail address for EMAIL_USER

### Step 4: Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

### Step 5: Test the Sync

1. Open the app in your browser
2. Click the **mail icon** (top right)
3. Check if the sync succeeds

---

## 🔍 Troubleshooting

### Error: "Invalid credentials" (still happening)

**Check these:**

1. **App Password has spaces**
   ```env
   # ❌ Wrong
   EMAIL_PASSWORD=abcd efgh ijkl mnop

   # ✅ Correct
   EMAIL_PASSWORD=abcdefghijklmnop
   ```

2. **Using regular password instead of App Password**
   - You MUST use the 16-character App Password
   - Your regular Gmail password won't work

3. **2FA not enabled**
   - App Passwords only work with 2FA enabled
   - Check: https://myaccount.google.com/security

4. **Wrong email address**
   ```env
   # Use your full Gmail address
   EMAIL_USER=yourname@gmail.com
   ```

### Error: "ENOTFOUND" or "Connection refused"

**Check these:**

1. **Wrong IMAP settings**
   ```env
   EMAIL_HOST=imap.gmail.com    # Must be exactly this
   EMAIL_PORT=993               # Must be 993 for SSL
   EMAIL_TLS=true              # Must be true
   ```

2. **Network/Firewall issues**
   - Check if port 993 is blocked
   - Try from a different network
   - Check corporate firewall settings

### Can't Find App Passwords Page

**If the App Passwords link doesn't work:**

1. Make sure 2FA is enabled first
2. Try this direct link: https://security.google.com/settings/security/apppasswords
3. Or manually navigate:
   - Google Account → Security → 2-Step Verification → App passwords

### "This setting is hidden" message

If you see "This setting is hidden because your account doesn't have 2-Step Verification":

1. You need to enable 2FA first
2. Go to https://myaccount.google.com/security
3. Set up 2-Step Verification
4. Then return to generate App Password

---

## 🔒 Security Notes

### App Password vs Regular Password

- **Regular Password**: Your main Gmail password for signing in
- **App Password**: A special 16-character password just for this app
- They're different! Never use your regular password in the app.

### Revoking Access

If you want to stop the app from accessing your email:

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Find "Expense Tracker" in the list
3. Click **Remove** or **Revoke**
4. The app will no longer be able to access your email

### Best Practices

1. ✅ Use a unique App Password for each app
2. ✅ Store App Passwords securely (never commit to git)
3. ✅ Revoke unused App Passwords
4. ✅ Keep your .env file in .gitignore
5. ✅ Don't share your App Password with anyone

---

## 📧 IMAP Access

Gmail's IMAP is automatically enabled for most accounts. If you have issues:

1. Go to [Gmail Settings](https://mail.google.com/mail/u/0/#settings/fwdandpop)
2. Click the **Forwarding and POP/IMAP** tab
3. Make sure **IMAP access** is enabled
4. Click **Save Changes**

---

## 🔄 Alternative: Using Other Email Providers

### Outlook/Hotmail

```env
EMAIL_USER=your.email@outlook.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=outlook.office365.com
EMAIL_PORT=993
EMAIL_TLS=true
```

Generate App Password at: https://account.microsoft.com/security

### Yahoo Mail

```env
EMAIL_USER=your.email@yahoo.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=imap.mail.yahoo.com
EMAIL_PORT=993
EMAIL_TLS=true
```

Generate App Password at: https://login.yahoo.com/account/security

### iCloud

```env
EMAIL_USER=your.email@icloud.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=imap.mail.me.com
EMAIL_PORT=993
EMAIL_TLS=true
```

Generate App Password at: https://appleid.apple.com/account/manage

---

## ✅ Verification

After setup, you should see:

```
✓ Synced X new expenses
```

If you see this, everything is working! 🎉

---

## 🆘 Still Having Issues?

1. **Double-check your .env file**
   - No spaces in password
   - Correct email address
   - Correct IMAP settings

2. **Check the server logs**
   - Look for detailed error messages in your terminal
   - The error will tell you exactly what's wrong

3. **Try with a test email**
   - Send yourself a test transaction email
   - Check if it appears in Gmail
   - Try syncing again

4. **Restart everything**
   ```bash
   # Stop the dev server
   # Clear any cached credentials
   rm -rf .next
   # Restart
   npm run dev
   ```

---

## 📝 Example .env File

Here's a complete example:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Configuration (Gmail)
EMAIL_USER=john.doe@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_TLS=true

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

Need more help? Check the [main README](../README.md) or open an issue on GitHub!
