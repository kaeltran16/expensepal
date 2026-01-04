# Google Authentication Setup Guide

This guide will walk you through setting up Google OAuth authentication for the Expense Tracker app.

## Overview

The app now includes Google authentication using Supabase Auth. Users must sign in with their Google account to access the application, and all data is now user-specific.

## Prerequisites

- A Supabase project (already set up)
- A Google Cloud project (or create a new one)
- Access to your Supabase dashboard

---

## Step 1: Configure Google Cloud Console

### 1.1 Create a Google Cloud Project (if you don't have one)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "Expense Tracker")
4. Click "Create"

### 1.2 Enable Google+ API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and click **Enable**

### 1.3 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name:** Expense Tracker
   - **User support email:** Your email
   - **Developer contact information:** Your email
5. Click **Save and Continue**
6. On the "Scopes" page, click **Save and Continue**
7. On the "Test users" page, add your email as a test user
8. Click **Save and Continue**
9. Review and click **Back to Dashboard**

### 1.4 Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type:** Web application
4. **Name:** Expense Tracker Web Client
5. **Authorized JavaScript origins:**
   - Add `https://<your-project-ref>.supabase.co`
   - For local development: `http://localhost:3000`
6. **Authorized redirect URIs:**
   - Add `https://<your-project-ref>.supabase.co/auth/v1/callback`
7. Click **Create**
8. **Save your Client ID and Client Secret** (you'll need these next)

---

## Step 2: Configure Supabase

### 2.1 Enable Google Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** in the list
5. Toggle it to **Enabled**
6. Enter your **Client ID** and **Client Secret** from Google Cloud Console
7. Click **Save**

### 2.2 Run Database Migration

You need to run the migration to add user_id columns and update RLS policies.

#### Option A: Using Supabase Dashboard

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy the contents of `supabase/migrations/006_add_user_authentication.sql`
4. Paste it into the SQL editor
5. Click **Run**
6. Verify the migration completed successfully

#### Option B: Using Supabase CLI (if installed)

```bash
supabase migration up
```

### 2.3 Verify Configuration

1. Go to **Authentication** → **Providers**
2. Check that Google is enabled
3. Note the callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`

---

## Step 3: Update Your Local Environment

### 3.1 Environment Variables

Your `.env.local` file should already have:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

No additional environment variables are needed for Google OAuth!

### 3.2 Install Dependencies (if needed)

```bash
npm install @radix-ui/react-dropdown-menu
```

---

## Step 4: Test the Authentication Flow

### 4.1 Start Your Development Server

```bash
npm run dev
```

### 4.2 Test Sign In

1. Open `http://localhost:3000` in your browser
2. You should be redirected to `/login`
3. Click "Continue with Google"
4. You'll be redirected to Google's sign-in page
5. Sign in with your Google account
6. Grant permissions to the app
7. You'll be redirected back to your app (main dashboard)

### 4.3 Verify User Data Isolation

1. Create some expenses while logged in
2. Sign out using the user menu (top right)
3. Sign in with a different Google account
4. Verify you don't see the previous user's expenses
5. Create new expenses
6. Sign out and sign back in with the first account
7. Verify you only see your own expenses

---

## Step 5: Deploy to Production

### 5.1 Update Redirect URLs

When you deploy to production (e.g., Vercel), you'll need to:

1. Go back to Google Cloud Console → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add your production URL to:
   - **Authorized JavaScript origins:** `https://your-domain.com`
   - **Authorized redirect URIs:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Click **Save**

### 5.2 Deploy Your App

```bash
# If using Vercel
vercel --prod

# Or commit and push to trigger automatic deployment
git add .
git commit -m "feat: Add Google authentication"
git push origin main
```

### 5.3 Test Production

1. Visit your production URL
2. Test the complete sign-in flow
3. Verify data isolation between users

---

## What Changed in the Codebase

### Database Changes

- Added `user_id` column to all tables:
  - `expenses`
  - `budgets`
  - `savings_goals`
  - `push_subscriptions`
- Updated RLS policies to restrict access by user
- Added indexes on `user_id` for better performance

### Authentication Flow

- Created `AuthProvider` context for managing auth state
- Added `/login` page with Google OAuth button
- Added `/auth/callback` route to handle OAuth redirect
- Created middleware to:
  - Refresh sessions automatically
  - Protect routes from unauthenticated access
  - Redirect authenticated users away from login page

### API Changes

- All API routes now:
  - Use the server-side Supabase client
  - Check for authenticated user
  - Return 401 if unauthenticated
  - Filter data by `user_id`

### UI Changes

- Added `UserMenu` component for sign-out
- Created beautiful login page with branding
- Added loading states during authentication

---

## Troubleshooting

### Issue: "Redirect URI mismatch" error

**Solution:** Make sure the redirect URI in Google Cloud Console exactly matches:
```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

### Issue: Migration fails

**Solution:**
1. Check if you have existing data in tables
2. For existing data, you may need to add `user_id` values manually or delete old data
3. Ensure you're running the migration in the correct order

### Issue: Can't sign in

**Solution:**
1. Check browser console for errors
2. Verify Google OAuth credentials are correct in Supabase
3. Ensure your email is added as a test user in Google Cloud Console
4. Check that the Google+ API is enabled

### Issue: "Invalid session" errors

**Solution:**
1. Clear browser cookies
2. Check that middleware is working correctly
3. Verify Supabase URL and keys are correct

### Issue: User sees other users' data

**Solution:**
1. Verify RLS policies are enabled: `ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;`
2. Check that the migration ran successfully
3. Ensure API routes are filtering by `user_id`

---

## Security Notes

### Row Level Security (RLS)

All tables now use RLS policies to ensure users can only access their own data. The policies are:

- **SELECT:** Users can only view their own records
- **INSERT:** Users can only create records with their own user_id
- **UPDATE:** Users can only update their own records
- **DELETE:** Users can only delete their own records

### Session Management

- Sessions are stored in secure HTTP-only cookies
- Sessions are automatically refreshed
- Sessions expire after 1 hour of inactivity
- Users are redirected to login if session expires

### API Security

- All API routes verify the user is authenticated
- All queries filter by the authenticated user's ID
- 401 errors are returned for unauthenticated requests

---

## Next Steps

After setting up authentication, you may want to:

1. **Update other API routes** - The email sync, budgets, goals, and stats routes also need to be updated to use authentication (follow the same pattern as expenses)
2. **Add the UserMenu to the main page** - Import and add `<UserMenu />` to the header in `app/page.tsx`
3. **Migrate existing data** - If you have existing data, you'll need to assign it to a user or delete it
4. **Test all features** - Ensure all features work with authentication enabled

---

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase logs in the dashboard
3. Verify all environment variables are correct
4. Review the migration file for any errors

---

**Congratulations!** 🎉 Your Expense Tracker now has secure Google authentication!

Users can now:
- Sign in with their Google account
- See only their own expenses
- Have their data isolated and secure
- Sign out when done

Happy tracking! 💰
