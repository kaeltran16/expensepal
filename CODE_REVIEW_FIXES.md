# Code Review Fixes - ExpensePal

Technical debt and security issues identified during code review. Prioritized by severity.

---

## Critical (Must fix before production)

### 1. Incomplete Route Protection in Middleware

**File:** `middleware.ts:33-35`

**Problem:** Only 5 routes are listed in `protectedRoutes`, but the app has 40+ API routes. Missing routes like `/api/email/sync`, `/api/recurring-expenses`, `/api/meals`, `/api/workouts`, etc.

**Fix:**
```typescript
// Option A: Protect all /api routes by default
const isApiRoute = request.nextUrl.pathname.startsWith('/api')
const isPublicApiRoute = ['/api/health', '/api/webhook'].some(route =>
  request.nextUrl.pathname.startsWith(route)
)

if (!user && isApiRoute && !isPublicApiRoute) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Option B: Use a whitelist pattern for public routes instead of blacklist for protected
const publicRoutes = ['/login', '/auth/callback', '/api/health']
const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

if (!user && !isPublicRoute) {
  // redirect or 401
}
```

---

### 2. Missing Input Validation on POST/PUT Routes

**Files:**
- `app/api/recurring-expenses/save-detected/route.ts`
- `app/api/expenses/route.ts`
- `app/api/settings/email/route.ts`

**Problem:** Using `any` type and no schema validation despite having `withAuthAndValidation` middleware available.

**Fix:** Create Zod schemas and use the existing middleware.

```typescript
// lib/api/schemas/recurring-expenses.ts
import { z } from 'zod'

export const DetectedExpenseSchema = z.object({
  merchant: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  averageAmount: z.number().positive().max(1_000_000_000),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  intervalDays: z.number().int().positive().max(365),
  nextExpected: z.string().datetime(),
  confidence: z.number().min(0).max(1),
})

export const SaveDetectedExpensesSchema = z.object({
  detectedExpenses: z.array(DetectedExpenseSchema).min(1).max(100),
})

// app/api/recurring-expenses/save-detected/route.ts
import { withAuthAndValidation } from '@/lib/api/middleware'
import { SaveDetectedExpensesSchema } from '@/lib/api/schemas/recurring-expenses'

export const POST = withAuthAndValidation(
  SaveDetectedExpensesSchema,
  async (request, user, { detectedExpenses }) => {
    // detectedExpenses is now fully typed and validated
  }
)
```

```typescript
// lib/api/schemas/expenses.ts
export const CreateExpenseSchema = z.object({
  amount: z.number().positive().max(1_000_000_000),
  currency: z.string().length(3).default('VND'),
  transaction_date: z.string().datetime().refine(
    (date) => new Date(date) <= new Date(),
    { message: 'Transaction date cannot be in the future' }
  ),
  merchant: z.string().min(1).max(255),
  category: z.string().min(1).max(100).default('Other'),
  transaction_type: z.enum(['Expense', 'Income']).default('Expense'),
  notes: z.string().max(1000).optional(),
  source: z.enum(['manual', 'email', 'api']).default('manual'),
})
```

---

### 3. Sequential Database Inserts in Email Sync

**File:** `app/api/email/sync/route.ts:100-182`

**Problem:** Loop with `await` creates N sequential DB calls. Slow and prone to partial failures.

**Fix:** Use batch insert with transaction.

```typescript
// Batch insert all expenses at once
const expensesToInsert = expenses.map(expense => ({
  user_id: user.id,
  transaction_type: expense.transactionType,
  amount: expense.amount,
  currency: expense.currency,
  transaction_date: expense.transactionDate,
  merchant: expense.merchant,
  source: expense.source,
  email_subject: expense.emailSubject,
  category: expense.category,
}))

// Use upsert with onConflict to handle duplicates gracefully
const { data: insertedExpenses, error } = await supabase
  .from('expenses')
  .upsert(expensesToInsert, {
    onConflict: 'user_id,transaction_date,merchant,amount',
    ignoreDuplicates: true
  })
  .select()

if (error) {
  throw new Error(`Batch insert failed: ${error.message}`)
}

// Batch insert processed_emails
const processedEmailsToInsert = expenses
  .filter(e => e.emailUid && e.emailAccount)
  .map((expense, index) => ({
    user_id: user.id,
    email_account: expense.emailAccount,
    email_uid: expense.emailUid,
    subject: expense.emailSubject,
    expense_id: insertedExpenses?.[index]?.id ?? null,
  }))

await supabase
  .from('processed_emails')
  .upsert(processedEmailsToInsert, { onConflict: 'user_id,email_account,email_uid' })
```

---

### 4. Query Parameter Validation

**File:** `app/api/expenses/route.ts:18-19`

**Problem:** `parseInt` without validation allows negative numbers, NaN, and extremely large values.

**Fix:**
```typescript
// lib/api/schemas/query-params.ts
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

export const ExpenseFiltersSchema = PaginationSchema.extend({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  merchant: z.string().max(255).optional(),
  category: z.string().max(100).optional(),
})

// Use withAuthAndQueryValidation
export const GET = withAuthAndQueryValidation(
  ExpenseFiltersSchema,
  async (request, user, filters) => {
    const { data, error } = await createExpenseQuery(supabase, user.id)
      .withFilters(filters)
      .limit(filters.limit)
      .offset(filters.offset)
      .execute()
    // ...
  }
)
```

---

### 5. Error Message Information Leakage

**File:** `lib/api/middleware.ts:49`

**Problem:** Raw error messages (including DB constraint names, internal errors) sent to client.

**Fix:**
```typescript
// lib/api/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public userMessage: string,
    public internalMessage?: string
  ) {
    super(userMessage)
  }
}

export function toSafeError(error: unknown): { message: string; status: number } {
  // Log full error internally
  console.error('Internal error:', error)

  if (error instanceof AppError) {
    return { message: error.userMessage, status: error.statusCode }
  }

  if (error instanceof z.ZodError) {
    return { message: 'Validation failed', status: 400 }
  }

  // Never expose internal errors
  return { message: 'An unexpected error occurred', status: 500 }
}

// middleware.ts
} catch (error) {
  const { message, status } = toSafeError(error)
  return NextResponse.json({ error: message }, { status })
}
```

---

## High Priority

### 6. Add Request Body Size Limits

**Problem:** No limit on request body size enables DoS attacks.

**Fix:** Add to `next.config.js`:
```javascript
module.exports = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}
```

Or in route handlers:
```typescript
export const POST = withAuth(async (request, user) => {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 1_000_000) {
    return NextResponse.json(
      { error: 'Request body too large' },
      { status: 413 }
    )
  }
  // ...
})
```

---

### 7. Fix Type Casting Issues

**File:** `app/api/email/sync/route.ts:254-259`

**Problem:** Multiple `as never` casts indicate stale types.

**Fix:**
```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id <project-id> > lib/supabase/database.types.ts
```

Then remove all `as never` casts. If table doesn't exist in types, add it to the schema.

---

### 8. Silent Failure Handling

**Files:** Multiple routes with `console.error` but no user notification.

**Problem:** Operations fail silently, user sees success message but data is incomplete.

**Fix:** Return partial success responses with details.
```typescript
interface SyncResult {
  success: boolean
  expenses: {
    created: number
    duplicates: number
    failed: number
  }
  meals: {
    created: number
    failed: number
  }
  warnings: string[]  // Add this
  errors: string[]    // Add this
}

// In response
return NextResponse.json({
  ...result,
  warnings: mealError ? ['Some meal entries failed to create'] : [],
  errors: failed > 0 ? [`${failed} expenses failed to import`] : [],
})
```

---

### 9. Timezone Handling

**File:** `app/api/recurring-expenses/save-detected/route.ts:28-29`

**Problem:** `new Date()` uses server timezone, not user timezone.

**Fix:**
```typescript
// Option A: Accept timezone from client
const SaveDetectedExpensesSchema = z.object({
  detectedExpenses: z.array(DetectedExpenseSchema),
  timezone: z.string().default('UTC'),  // e.g., 'Asia/Ho_Chi_Minh'
})

// Option B: Store as UTC and let client convert
start_date: new Date().toISOString(),  // Always UTC
// Client displays in local timezone

// Option C: Store user's timezone preference in profile
const { data: profile } = await supabase
  .from('profiles')
  .select('timezone')
  .eq('user_id', user.id)
  .single()
```

---

### 10. Remove Console Logging of PII

**File:** `app/api/email/sync/route.ts:45-46`

**Problem:** Logging user IDs and emails to stdout.

**Fix:**
```typescript
// Use structured logging without PII
import { logger } from '@/lib/logger'

logger.info('email_sync_started', {
  accountCount: emailServices.length,
  // Don't log user.id or user.email directly
  userId: hashUserId(user.id),  // One-way hash for correlation
})

// lib/logger.ts
export const logger = {
  info: (event: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${event}`, data)
    } else {
      // Send to logging service (DataDog, LogRocket, etc.)
    }
  },
  error: (event: string, error: unknown, data?: Record<string, unknown>) => {
    console.error(`[ERROR] ${event}`, { error, ...data })
  }
}
```

---

## Medium Priority

### 11. Add Idempotency for Email Sync

**Problem:** Duplicate syncs can create inconsistent state.

**Fix:**
```typescript
// Add idempotency key support
export const POST = withAuth(async (request, user) => {
  const idempotencyKey = request.headers.get('X-Idempotency-Key')

  if (idempotencyKey) {
    // Check if we've already processed this request
    const { data: existing } = await supabase
      .from('idempotency_keys')
      .select('response')
      .eq('key', idempotencyKey)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json(existing.response)
    }
  }

  // ... process sync ...

  // Store result with idempotency key
  if (idempotencyKey) {
    await supabase.from('idempotency_keys').insert({
      key: idempotencyKey,
      user_id: user.id,
      response: result,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),  // 24h
    })
  }

  return NextResponse.json(result)
})
```

---

### 12. Add Sanity Bounds for LLM Outputs

**File:** `lib/calorie-estimator.ts`

**Problem:** LLM could return absurd values (50,000 calories for coffee).

**Fix:**
```typescript
const SANITY_BOUNDS = {
  calories: { min: 0, max: 5000 },      // Max realistic single meal
  protein: { min: 0, max: 200 },         // grams
  carbs: { min: 0, max: 500 },           // grams
  fat: { min: 0, max: 200 },             // grams
  confidence: { min: 0, max: 1 },
}

function sanitizeEstimate(estimate: CalorieEstimate): CalorieEstimate {
  return {
    calories: clamp(estimate.calories, SANITY_BOUNDS.calories),
    protein: estimate.protein ? clamp(estimate.protein, SANITY_BOUNDS.protein) : null,
    carbs: estimate.carbs ? clamp(estimate.carbs, SANITY_BOUNDS.carbs) : null,
    fat: estimate.fat ? clamp(estimate.fat, SANITY_BOUNDS.fat) : null,
    confidence: estimate.confidence
      ? clamp(estimate.confidence, SANITY_BOUNDS.confidence)
      : 0.5,  // Default to medium confidence if out of bounds
    reasoning: estimate.reasoning,
    source: estimate.source,
  }
}

function clamp(value: number, bounds: { min: number; max: number }): number {
  return Math.max(bounds.min, Math.min(bounds.max, value))
}
```

---

### 13. Handle Orphaned Meals on Category Change

**Problem:** Changing expense from Food to another category leaves orphaned meal record.

**Fix:** Add cascade delete or cleanup in expense update handler.
```typescript
// app/api/expenses/[id]/route.ts
export const PUT = withAuth(async (request, user) => {
  const { id } = params
  const body = await request.json()

  // Get current expense to check category change
  const { data: current } = await supabase
    .from('expenses')
    .select('category')
    .eq('id', id)
    .single()

  // If changing FROM Food to something else, delete associated meal
  if (current?.category === 'Food' && body.category !== 'Food') {
    await supabase
      .from('meals')
      .delete()
      .eq('expense_id', id)
  }

  // If changing TO Food from something else, create meal
  if (current?.category !== 'Food' && body.category === 'Food') {
    // ... create meal entry
  }

  // Update expense
  const { data, error } = await supabase
    .from('expenses')
    .update(body)
    .eq('id', id)
    .select()

  // ...
})
```

---

### 14. Add Rate Limiting

**Problem:** No rate limiting on API routes.

**Fix:** Use Vercel's built-in or implement custom.
```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),  // 10 requests per 10 seconds
})

export async function checkRateLimit(identifier: string): Promise<boolean> {
  const { success } = await ratelimit.limit(identifier)
  return success
}

// In middleware or route
const allowed = await checkRateLimit(user.id)
if (!allowed) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429 }
  )
}
```

---

## Implementation Order

1. **Week 1:** Items 1-5 (Critical security/stability)
2. **Week 2:** Items 6-10 (High priority improvements)
3. **Week 3:** Items 11-14 (Medium priority hardening)

---

## Testing Checklist

- [ ] Negative numbers in query params return 400
- [ ] Extremely large limit values are capped
- [ ] Invalid JSON body returns 400, not 500
- [ ] Unauthorized requests to ALL routes return 401
- [ ] Error responses don't leak internal details
- [ ] Partial sync failures return appropriate warnings
- [ ] Duplicate syncs don't create duplicate data
- [ ] Category changes properly handle meal records
- [ ] LLM returning invalid data doesn't crash app
