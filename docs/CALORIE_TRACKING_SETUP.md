# Calorie Tracking Setup & Testing Guide

## Overview

The calorie tracking feature allows users to log meals, track daily calorie intake, and view nutrition analytics. **This feature requires user authentication** to work properly.

## Prerequisites

### 1. Supabase Authentication Setup

The calorie tracking feature requires Google OAuth authentication. Follow these steps:

#### A. Enable Google OAuth in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Configure OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to **APIs & Services** → **Credentials**
   - Create **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (for local dev)
     - `https://your-domain.com/auth/callback` (for production)
   - Copy **Client ID** and **Client Secret**
5. Paste credentials into Supabase Google provider settings
6. Save changes

#### B. Database Tables

The following tables must exist in your Supabase database:

```sql
-- Meals table
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein INTEGER NOT NULL DEFAULT 0,
  carbs INTEGER NOT NULL DEFAULT 0,
  fat INTEGER NOT NULL DEFAULT 0,
  meal_time TEXT CHECK (meal_time IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  meal_date TIMESTAMPTZ NOT NULL,
  expense_id UUID REFERENCES expenses(id),
  notes TEXT,
  source TEXT DEFAULT 'manual',
  confidence TEXT,
  llm_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calorie goals table
CREATE TABLE calorie_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_calories INTEGER NOT NULL,
  protein_target INTEGER,
  carbs_target INTEGER,
  fat_target INTEGER,
  goal_type TEXT DEFAULT 'maintenance',
  notes TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Run the migration files in `supabase/migrations/` if you haven't already.

### 2. OpenRouter API Key (Optional)

For AI-powered calorie estimation, you need an OpenRouter API key:

1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Sign up or log in
3. Create a new API key
4. Add to `.env`:
   ```
   OPENROUTER_API_KEY=your-api-key-here
   ```

## Testing the Calories Tab

### Method 1: Using Google OAuth (Recommended)

#### Step 1: Start the Development Server

```bash
npm run dev
```

#### Step 2: Sign In

1. Navigate to `http://localhost:3000`
2. You'll be redirected to `/login`
3. Click **"Continue with Google"**
4. Select your Google account
5. You'll be redirected back to the app

#### Step 3: Access Calories Tab

1. Navigate to the **Calories** tab in the bottom navigation
2. You should now see:
   - Quick meal form to add meals
   - Daily calorie tracker showing your goal
   - List of recent meals
   - Nutrition charts (if you have logged meals)

### Method 2: Testing Without Authentication (Demo Mode)

If you want to test the UI without setting up OAuth, you can temporarily bypass authentication:

#### Option A: Create Anonymous Access Route

Add this endpoint for testing:

```typescript
// app/api/meals/demo/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // Return sample meal data
  return NextResponse.json({
    meals: [
      {
        id: '1',
        name: 'Pho Bo',
        calories: 450,
        protein: 25,
        carbs: 60,
        fat: 12,
        meal_time: 'lunch',
        meal_date: new Date().toISOString(),
        source: 'manual',
      },
      // Add more sample meals
    ],
    total: 3,
  })
}
```

#### Option B: Mock Data in Development

Update `app/page.tsx` to use mock data when auth fails:

```typescript
// In fetchMeals function
if (response.status === 401 && process.env.NODE_ENV === 'development') {
  // Use mock data for development
  setMeals([
    {
      id: '1',
      name: 'Sample Meal',
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20,
      meal_time: 'lunch',
      meal_date: new Date().toISOString(),
      source: 'manual',
    },
  ])
  return
}
```

### Method 3: Using Supabase CLI & Local Auth

For local development with full auth:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Update .env with local credentials
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
```

## Common Issues & Troubleshooting

### Issue 1: "Please sign in to view calorie tracking" toast appears

**Cause:** User is not authenticated.

**Solution:**
1. Check if you're logged in (look for user info in browser console)
2. Clear cookies and try logging in again
3. Verify Supabase OAuth is configured correctly

### Issue 2: Calories tab shows loading state indefinitely

**Cause:** API call is failing silently.

**Solution:**
1. Open browser DevTools → Network tab
2. Navigate to Calories tab
3. Look for failed API calls to `/api/meals` or `/api/calorie-goals`
4. Check the response status and error message

### Issue 3: "Failed to load meals" error

**Cause:** Database tables don't exist or user doesn't have permission.

**Solution:**
1. Run migrations: Check `supabase/migrations/` folder
2. Verify tables exist in Supabase dashboard
3. Check Row Level Security (RLS) policies

### Issue 4: OAuth redirect fails

**Cause:** Redirect URL not whitelisted in Google Console.

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client ID
3. Add `http://localhost:3000/auth/callback` to Authorized redirect URIs
4. Save and try again

## Testing Checklist

Before committing changes, verify:

- [ ] User can sign in with Google OAuth
- [ ] Calories tab loads without errors
- [ ] Quick meal form submits successfully
- [ ] Calorie tracker displays today's totals
- [ ] Meal list shows recent meals
- [ ] Nutrition charts render when data exists
- [ ] Error messages are user-friendly
- [ ] Auth errors show helpful toast messages
- [ ] Loading states work properly

## API Endpoints

All endpoints require authentication (`Authorization` header or session cookie):

### GET `/api/meals`

Fetch user's meals with optional filters.

**Query Params:**
- `limit` (default: 50)
- `offset` (default: 0)
- `startDate` (ISO 8601)
- `endDate` (ISO 8601)
- `mealTime` (breakfast|lunch|dinner|snack|other)

**Response:**
```json
{
  "meals": [...],
  "total": 42
}
```

### POST `/api/meals`

Create a new meal entry.

**Body:**
```json
{
  "name": "Chicken Rice",
  "meal_time": "lunch",
  "meal_date": "2025-11-22T12:00:00Z",
  "estimate": true,  // Use AI to estimate calories
  "portionSize": "regular",
  "notes": "With extra vegetables"
}
```

**Response:**
```json
{
  "id": "...",
  "name": "Chicken Rice",
  "calories": 650,
  "protein": 45,
  "carbs": 70,
  "fat": 18,
  ...
}
```

### GET `/api/calorie-goals`

Get user's active calorie goal.

**Response:**
```json
{
  "daily_calories": 2000,
  "protein_target": 100,
  "carbs_target": 250,
  "fat_target": 65,
  "goal_type": "maintenance"
}
```

### GET `/api/calorie-stats`

Get calorie statistics for a date range.

**Query Params:**
- `startDate` (ISO 8601)
- `endDate` (ISO 8601)

**Response:**
```json
{
  "totalCalories": 15000,
  "totalProtein": 800,
  "totalCarbs": 1800,
  "totalFat": 500,
  "mealCount": 21,
  "averageCaloriesPerDay": 2142,
  "byMealTime": {...},
  "byDate": {...}
}
```

## Development Tips

### Enable Verbose Logging

Add to browser console:
```javascript
localStorage.setItem('debug', 'auth,meals,calories')
```

### Inspect Auth State

Check current auth state:
```javascript
// In browser console
const { data } = await supabase.auth.getSession()
console.log('Current user:', data.session?.user)
```

### Mock AI Calorie Estimation

For testing without OpenRouter API:
```typescript
// lib/calorie-estimator.ts
export const calorieEstimator = {
  async estimate(foodName: string) {
    // Return mock data for development
    return {
      calories: 500,
      protein: 25,
      carbs: 60,
      fat: 15,
      source: 'mock',
      confidence: 'high',
      reasoning: 'Mock estimation for testing',
    }
  },
}
```

## Next Steps

Once authentication is working:

1. **Add meals manually** - Test the Quick Meal Form
2. **Enable email sync** - Automatically import GrabFood orders
3. **Set calorie goals** - Customize your daily targets
4. **View analytics** - Check nutrition charts and trends

## Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://support.google.com/cloud/answer/6158849)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Next.js Auth Patterns](https://nextjs.org/docs/authentication)

---

**Last Updated:** 2025-11-22
