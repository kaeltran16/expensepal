# AI Budget Recommendations - Cost-Effective Caching System

## 🎯 Problem Solved

The initial implementation had **client-side only caching** (24hr React Query cache), which meant:
- ❌ Every user session after 24 hours triggers a new LLM call
- ❌ Different users/devices = duplicate expensive API calls
- ❌ No way to prevent redundant calculations
- 💸 **High API costs** as the user base grows

## ✅ Solution: Server-Side Database Caching

Recommendations are now **stored in Supabase** and cached for **7 days**, dramatically reducing LLM API costs.

---

## 📊 Architecture

### **1. Database Schema**
**Table:** `budget_recommendations_cache`

```sql
CREATE TABLE budget_recommendations_cache (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,

  -- Cached data
  recommendations JSONB NOT NULL,

  -- Metadata
  months_analyzed INTEGER DEFAULT 12,
  data_points INTEGER,
  total_savings_opportunity BIGINT,
  ai_powered_count INTEGER,
  algorithmic_count INTEGER,

  -- Cache control
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- ✅ **JSONB storage** for flexible recommendation data
- ✅ **Automatic expiry** after 7 days
- ✅ **Per-user caching** with RLS policies
- ✅ **Unique constraint** ensures one active cache per user
- ✅ **Cleanup function** for expired entries

---

### **2. API Endpoint Logic**

**File:** `app/api/budgets/ai-recommendations/route.ts`

#### **Request Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ GET /api/budgets/ai-recommendations?months=12&refresh=false │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │ Step 1: Check Cache              │
         │ - Query: user_id + months_analyzed│
         │ - Filter: expires_at > NOW()     │
         └──────────────────────────────────┘
                    │               │
         ┌──────────┴──────┐       │
         ▼                 ▼       ▼
    ✅ Found          ❌ Not Found / Expired
    │                      │
    ▼                      ▼
Return Cached      Generate New Recommendations
(instant, free)           │
                          ▼
                   Analyze 12 months of data
                          │
                          ▼
                   Call LLM API (Gemini 2.5)
                   - Seasonal factors
                   - Lifestyle insights
                   - Savings opportunities
                          │
                          ▼
                   Store in Cache Table
                   - expires_at = NOW() + 7 days
                   - Delete old cache entries
                          │
                          ▼
                   Return Fresh Data
```

#### **Query Parameters:**

- `months` (default: 12) - Analyze 6 or 12 months of history
- `includeBasic` (default: true) - Include algorithmic fallback
- **`refresh` (default: false) - Force regenerate, bypass cache** ⭐

---

### **3. Cost Analysis**

#### **Without Caching (Old System):**
```
Users: 100
Active sessions/day per user: 2
LLM calls/month: 100 × 2 × 30 = 6,000 calls
Cost per call: ~$0.01 (Gemini 2.5 Flash with 1500 tokens)
Monthly cost: $60

With 1,000 users: $600/month 💸
With 10,000 users: $6,000/month 💸💸💸
```

#### **With 7-Day Caching (New System):**
```
Users: 100
Cache duration: 7 days
LLM calls/month: 100 × (30/7) ≈ 429 calls
Monthly cost: $4.29

With 1,000 users: $42.90/month ✅
With 10,000 users: $429/month ✅

💰 SAVINGS: 93% cost reduction!
```

---

### **4. Cache Behavior**

#### **Scenario 1: First Request**
```
User opens Budgets tab
  ↓
No cache exists
  ↓
Generate recommendations (LLM call)
  ↓
Store in DB (expires in 7 days)
  ↓
Return fresh data
  ↓
Display in UI with "Generated today"
```

#### **Scenario 2: Subsequent Requests (within 7 days)**
```
User opens Budgets tab
  ↓
Cache found & valid
  ↓
Return cached data (instant, no LLM call)
  ↓
Display in UI with "Cached • Expires [date]"
```

#### **Scenario 3: Manual Refresh**
```
User clicks Refresh button
  ↓
API called with ?refresh=true
  ↓
Bypass cache
  ↓
Generate new recommendations (LLM call)
  ↓
Delete old cache
  ↓
Store new cache (expires in 7 days)
  ↓
Return fresh data
  ↓
Display in UI with "Generated just now"
```

#### **Scenario 4: Expired Cache (>7 days)**
```
User opens Budgets tab
  ↓
Cache exists but expired
  ↓
Automatically regenerate (LLM call)
  ↓
Update cache with new expiry
  ↓
Return fresh data
```

---

### **5. Frontend Integration**

#### **React Hook**
**File:** `lib/hooks/use-budgets.ts`

```tsx
const { data, isLoading, refetch } = useAIBudgetRecommendations(
  { months: 12, includeBasic: true },
  { staleTime: 1000 * 60 * 60 * 24 } // 24hr client cache
)

// Force refresh
const handleRefresh = async () => {
  await fetchAIBudgetRecommendations({
    months: 12,
    refresh: true // Bypass server cache
  })
  await refetch()
}
```

#### **UI Component**
**File:** `components/ai-budget-recommendations-panel.tsx`

**Cache Indicators:**
- 🔵 **"Cached"** badge when using cached data
- 📅 **"Expires [date]"** shows when cache expires
- 🔄 **Refresh button** to force regeneration
- ⚡ **"Generated just now"** for fresh data

---

## 🚀 Deployment Steps

### **1. Run Migration**
```bash
# Local development
npx supabase db reset

# Or apply specific migration
npx supabase migration up
```

### **2. Verify Table Creation**
```sql
-- Check if table exists
SELECT * FROM budget_recommendations_cache LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'budget_recommendations_cache';
```

### **3. Test Caching**

#### **First request (generates new):**
```bash
curl "http://localhost:3000/api/budgets/ai-recommendations?months=12"
# Response: { cached: false, generatedAt: "2026-01-06...", expiresAt: "2026-01-13..." }
```

#### **Second request (returns cached):**
```bash
curl "http://localhost:3000/api/budgets/ai-recommendations?months=12"
# Response: { cached: true, generatedAt: "2026-01-06...", expiresAt: "2026-01-13..." }
```

#### **Force refresh:**
```bash
curl "http://localhost:3000/api/budgets/ai-recommendations?months=12&refresh=true"
# Response: { cached: false, generatedAt: "2026-01-06...", expiresAt: "2026-01-13..." }
```

---

## 🧹 Maintenance

### **Cleanup Expired Cache Entries**

The migration includes a cleanup function. You can:

#### **Option 1: Manual Cleanup**
```sql
SELECT cleanup_expired_budget_recommendations();
-- Returns: number of deleted rows
```

#### **Option 2: Automated Cron Job** (Recommended)
```sql
-- Run daily at midnight
SELECT cron.schedule(
  'cleanup-budget-recommendations-cache',
  '0 0 * * *',
  'SELECT cleanup_expired_budget_recommendations();'
);
```

#### **Option 3: Supabase Dashboard**
1. Go to Database → Functions
2. Run `cleanup_expired_budget_recommendations()`
3. Schedule via pg_cron extension

---

## 📊 Monitoring

### **Check Cache Hit Rate**
```sql
-- Total recommendations generated in last 30 days
SELECT COUNT(*) as total_requests
FROM budget_recommendations_cache
WHERE generated_at > NOW() - INTERVAL '30 days';

-- Average cache duration before refresh
SELECT AVG(EXTRACT(EPOCH FROM (NOW() - generated_at))/86400) as avg_days_before_refresh
FROM budget_recommendations_cache
WHERE generated_at > NOW() - INTERVAL '30 days';
```

### **View Active Caches**
```sql
SELECT
  user_id,
  months_analyzed,
  ai_powered_count,
  total_savings_opportunity,
  generated_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - NOW()))/3600 as hours_remaining
FROM budget_recommendations_cache
WHERE expires_at > NOW()
ORDER BY generated_at DESC;
```

---

## 🎛️ Configuration Options

### **Change Cache Duration**

To change from 7 days to another duration:

**Option 1: Update API Code**
```typescript
// In app/api/budgets/ai-recommendations/route.ts
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + 14) // 14 days instead of 7
```

**Option 2: Update Database Default**
```sql
ALTER TABLE budget_recommendations_cache
ALTER COLUMN expires_at
SET DEFAULT (NOW() + INTERVAL '14 days');
```

### **Adjust Client Cache**
```typescript
// In lib/hooks/use-budgets.ts
staleTime: 1000 * 60 * 60 * 48 // 48 hours instead of 24
```

---

## 🔒 Security

**RLS Policies Included:**
- ✅ Users can only view their own recommendations
- ✅ Users can only create/update/delete their own cache entries
- ✅ Automatic user_id validation
- ✅ Foreign key constraint to auth.users

**Privacy:**
- ✅ Only aggregated spending data sent to LLM (no raw transactions)
- ✅ Cached recommendations stored securely in user's own row
- ✅ No cross-user data leakage

---

## 🎉 Summary

### **What Changed:**
1. ✅ Added `budget_recommendations_cache` table
2. ✅ API checks cache before generating recommendations
3. ✅ Cache expires after 7 days automatically
4. ✅ UI shows cache status and expiry date
5. ✅ Refresh button bypasses cache

### **Benefits:**
- 💰 **93% cost reduction** on LLM API calls
- ⚡ **Instant loading** for cached recommendations
- 🔄 **Manual refresh** when user adds new expenses
- 📊 **Scalable** as user base grows
- 🧹 **Automatic cleanup** of expired entries

### **Files Modified:**
1. `supabase/migrations/021_add_budget_recommendations_cache.sql` - Database schema
2. `app/api/budgets/ai-recommendations/route.ts` - Cache logic
3. `lib/hooks/use-budgets.ts` - Refresh support
4. `components/ai-budget-recommendations-panel.tsx` - Cache indicators

---

**Your AI budget recommendations are now cost-effective and production-ready!** 🚀
