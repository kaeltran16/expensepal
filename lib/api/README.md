# API Middleware & Validation Guide

This guide explains how to use the standardized middleware and validation for all API routes.

## Quick Reference

### Already Updated Routes (31/31) - 100% Complete! 🎉✅
- ✅ `/api/expenses` - Uses `withAuth` + Query Builder
- ✅ `/api/budgets` - Uses `withAuth`
- ✅ `/api/goals` - Uses `withAuth`
- ✅ `/api/meals` - Uses `withAuth`
- ✅ `/api/workouts` - Uses `withAuth`
- ✅ `/api/stats` - Uses `withAuth` + Query Builder
- ✅ `/api/calorie-stats` - Uses `withAuth` + MealQueryBuilder
- ✅ `/api/budgets/predictions` - Uses `withAuth` + BudgetQueryBuilder + ExpenseQueryBuilder
- ✅ `/api/workout-templates` - Uses `withAuth` + `withAuthAndValidation`
- ✅ `/api/exercises` - Uses `withOptionalAuth`
- ✅ `/api/categories` - Uses `withAuth` + `withAuthAndValidation`
- ✅ `/api/expenses/[id]` - Uses `withAuth` (GET, PUT, DELETE)
- ✅ `/api/budgets/[id]` - Uses `withAuth` (PUT, DELETE)
- ✅ `/api/goals/[id]` - Uses `withAuth` (PUT, DELETE)
- ✅ `/api/meals/[id]` - Uses `withAuth` (PUT, DELETE)
- ✅ `/api/workouts/[id]` - Uses `withAuth` (GET, PUT, DELETE)
- ✅ `/api/calorie-goals` - Uses `withAuth` + `withAuthAndValidation` (GET, POST, PUT)
- ✅ `/api/profile` - Uses `withAuth` + `withAuthAndValidation` (GET, PUT)
- ✅ `/api/ai-insights` - Uses `withAuth` (POST)
- ✅ `/api/merchants/suggest-category` - Uses `withOptionalAuth` (GET)
- ✅ `/api/email/sync` - Uses `withAuth` (GET, POST)
- ✅ `/api/settings/email` - Uses `withAuth` (GET, POST, DELETE)
- ✅ `/api/personal-records` - Uses `withAuth` (GET, POST)
- ✅ `/api/custom-exercises` - Uses `withAuth` + `withAuthAndValidation` (GET, POST, PUT, DELETE)
- ✅ `/api/exercise-favorites` - Uses `withAuth` (GET, POST, DELETE)
- ✅ `/api/scheduled-workouts` - Uses `withAuth` (GET, POST)
- ✅ `/api/scheduled-workouts/[id]` - Uses `withAuth` (PUT, DELETE)
- ✅ `/api/notifications/subscribe` - Uses `withAuth` (POST)
- ✅ `/api/notifications/unsubscribe` - Uses `withAuth` (POST)
- ✅ `/api/workout-templates/[id]` - Uses `withAuth` (PUT, DELETE)
- ✅ `/api/exercises/[id]/history` - Uses `withAuth` (GET)

---

## Pattern 1: Simple Auth (GET requests)

### Before
```typescript
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Business logic here...
    const data = await fetchData(user.id)

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### After
```typescript
import { withAuth } from '@/lib/api/middleware'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  // Business logic here...
  const data = await fetchData(user.id)

  return NextResponse.json({ data })
})
```

**Benefits:**
- ✅ -8 lines of boilerplate
- ✅ Automatic error handling
- ✅ Consistent 401 responses
- ✅ Type-safe `user` parameter

---

## Pattern 2: Auth + Body Validation (POST/PUT requests)

### Before
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Manual validation
    if (!body.name || !body.amount) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Business logic...
    const result = await create(user.id, body)

    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### After
```typescript
import { withAuthAndValidation } from '@/lib/api/middleware'
import { CreateExpenseSchema } from '@/lib/api/schemas'

export const POST = withAuthAndValidation(
  CreateExpenseSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()

    // validatedData is fully typed and validated!
    const result = await create(user.id, validatedData)

    return NextResponse.json({ result })
  }
)
```

**Benefits:**
- ✅ -12 lines of boilerplate
- ✅ Automatic validation with clear error messages
- ✅ Type-safe validated data
- ✅ Consistent 400 responses for validation errors

---

## Pattern 3: Auth + Query Param Validation (GET with filters)

### Before
```typescript
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Manual validation
  if (limit > 1000 || limit < 1) {
    return NextResponse.json({ error: 'Invalid limit' }, { status: 400 })
  }

  const data = await fetch(user.id, { limit, offset })
  return NextResponse.json({ data })
}
```

### After
```typescript
import { withAuthAndQueryValidation } from '@/lib/api/middleware'
import { ExpenseFiltersSchema } from '@/lib/api/schemas'

export const GET = withAuthAndQueryValidation(
  ExpenseFiltersSchema,
  async (request, user, filters) => {
    const supabase = createClient()

    // filters are fully typed and validated!
    const data = await fetch(user.id, filters)
    return NextResponse.json({ data })
  }
)
```

**Benefits:**
- ✅ -10 lines of boilerplate
- ✅ Automatic coercion (strings → numbers)
- ✅ Clear validation rules
- ✅ Type-safe filter parameters

---

## Pattern 4: Multiple HTTP Methods

### Before
```typescript
export async function GET(request: NextRequest) {
  // Auth + logic...
}

export async function POST(request: NextRequest) {
  // Auth + logic...
}

export async function DELETE(request: NextRequest) {
  // Auth + logic...
}
```

### After
```typescript
import { withMethods } from '@/lib/api/middleware'

export const { GET, POST, DELETE } = withMethods({
  GET: async (request, user) => {
    // Logic here...
  },

  POST: async (request, user) => {
    // Logic here...
  },

  DELETE: async (request, user) => {
    // Logic here...
  },
})
```

---

## Available Schemas

Located in `lib/api/schemas.ts`:

- `CreateExpenseSchema` / `UpdateExpenseSchema`
- `CreateBudgetSchema` / `UpdateBudgetSchema`
- `CreateGoalSchema` / `UpdateGoalSchema`
- `CreateMealSchema` / `UpdateMealSchema`
- `CreateWorkoutSchema` / `UpdateWorkoutSchema`
- `CreateWorkoutTemplateSchema`
- `CreateCustomExerciseSchema`
- `UpdateProfileSchema`
- `UpdateCalorieGoalSchema`
- `CreateCategorySchema`
- `ExpenseFiltersSchema`

---

## Migration Checklist

For each route:

1. ✅ Import appropriate middleware from `@/lib/api/middleware`
2. ✅ Import schema from `@/lib/api/schemas` (if validating data)
3. ✅ Replace `export async function GET` with `export const GET = withAuth(...)`
4. ✅ Remove manual auth checking code
5. ✅ Remove try-catch wrapper (middleware handles errors)
6. ✅ Update function signature to receive `user` parameter
7. ✅ For POST/PUT: Use `withAuthAndValidation` with schema
8. ✅ For GET with query params: Use `withAuthAndQueryValidation`
9. ✅ Test the route works correctly

---

## Error Handling

The middleware automatically handles:
- **401 Unauthorized** - Missing/invalid auth token
- **400 Bad Request** - Zod validation failures (with detailed error messages)
- **500 Internal Server Error** - Unexpected exceptions

---

## Type Safety

All middleware functions preserve full TypeScript type safety:

```typescript
// User is typed as Supabase User
export const GET = withAuth(async (request, user) => {
  user.id // ✅ string
  user.email // ✅ string | undefined
})

// Validated data is fully typed from schema
export const POST = withAuthAndValidation(
  CreateExpenseSchema,
  async (request, user, validatedData) => {
    validatedData.amount // ✅ number (validated as positive)
    validatedData.merchant // ✅ string (validated as 1-100 chars)
    validatedData.notes // ✅ string | undefined (optional)
  }
)
```

---

---

## Query Builder Pattern

The Query Builder provides a fluent API for building complex database queries with filtering, pagination, and sorting.

### Available Query Builders

Located in `lib/api/query-builder.ts`:

- `ExpenseQueryBuilder` - For expenses table
- `BudgetQueryBuilder` - For budgets table
- `GoalQueryBuilder` - For goals table
- `MealQueryBuilder` - For meals table
- `WorkoutQueryBuilder` - For workouts table

### Factory Functions

```typescript
import { createExpenseQuery, createBudgetQuery, createGoalQuery } from '@/lib/api/query-builder'

// Create a query builder
const query = createExpenseQuery(supabase, userId)
```

### Basic Usage

```typescript
import { createExpenseQuery } from '@/lib/api/query-builder'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  // Simple query
  const { data, error } = await createExpenseQuery(supabase, user.id)
    .limit(50)
    .execute()

  if (error) throw new Error(error.message)

  return NextResponse.json({ expenses: data })
})
```

### Advanced Filtering

```typescript
// Method chaining
const { data } = await createExpenseQuery(supabase, user.id)
  .byCategory('Food')
  .byDateRange('2024-01-01', '2024-12-31')
  .orderByAmount(false) // descending
  .limit(100)
  .execute()

// Using filters object
const { data } = await createExpenseQuery(supabase, user.id)
  .withFilters({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    category: 'Food',
    merchant: 'Starbucks',
    minAmount: 10000,
    maxAmount: 100000,
  })
  .execute()
```

### Pagination

```typescript
// Page-based pagination
const { data } = await createExpenseQuery(supabase, user.id)
  .paginate(2, 50) // page 2, 50 items per page
  .execute()

// Offset-based pagination
const { data } = await createExpenseQuery(supabase, user.id)
  .limit(50)
  .offset(100)
  .execute()
```

### Migration Example: Before & After

**Before (Manual Query Building):**
```typescript
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  const limit = searchParams.get('limit') || '100'
  const offset = searchParams.get('offset') || '0'
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const category = searchParams.get('category')

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

  if (startDate) query = query.gte('transaction_date', startDate)
  if (endDate) query = query.lte('transaction_date', endDate)
  if (category) query = query.eq('category', category)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return NextResponse.json({ expenses: data })
})
```

**After (Query Builder):**
```typescript
import { createExpenseQuery } from '@/lib/api/query-builder'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data, error } = await createExpenseQuery(supabase, user.id)
    .withFilters({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      category: searchParams.get('category') || undefined,
    })
    .limit(limit)
    .offset(offset)
    .execute()

  if (error) throw new Error(error.message)

  return NextResponse.json({ expenses: data })
})
```

**Benefits:**
- ✅ Cleaner, more readable code
- ✅ Reusable filtering logic
- ✅ Type-safe query building
- ✅ Consistent query patterns across codebase
- ✅ Easy to add new filters

---

## API Response Types

Standardized response structures for consistent API contracts across frontend and backend.

### Available Response Types

Located in `lib/api/types.ts`:

#### Generic Response Types
- `ApiResponse<T>` - Base response wrapper
- `SuccessResponse<T>` - Success response
- `ErrorResponse` - Error response
- `ListResponse<T>` - List of items
- `PaginatedResponse<T>` - Paginated list

#### Entity-Specific Response Types
- `GetExpensesResponse` / `CreateExpenseResponse` / `UpdateExpenseResponse` / `DeleteExpenseResponse`
- `GetBudgetsResponse` / `CreateBudgetResponse` / etc.
- `GetGoalsResponse` / `CreateGoalResponse` / etc.
- `GetMealsResponse` / `CreateMealResponse` / etc.
- `GetWorkoutsResponse` / `CreateWorkoutResponse` / etc.

#### Analytics Response Types
- `GetExpenseStatsResponse`
- `GetBudgetPredictionsResponse`
- `GetCalorieStatsResponse`
- `GetWorkoutStatsResponse`
- `GetInsightsResponse`

### Helper Functions

```typescript
import {
  createSuccessResponse,
  createErrorResponse,
  createListResponse,
  createPaginatedResponse,
} from '@/lib/api/types'

// Create success response
const response = createSuccessResponse(data, 'Operation successful')

// Create error response
const errorResponse = createErrorResponse('Validation failed', [
  { path: 'amount', message: 'Amount must be positive' }
])

// Create list response
const listResponse = createListResponse(expenses, expenses.length)

// Create paginated response
const paginatedResponse = createPaginatedResponse(data, 100, 1, 20)
```

### Type Guards

```typescript
import { isSuccessResponse, isErrorResponse, isPaginatedResponse } from '@/lib/api/types'

const response = await fetchData()

if (isSuccessResponse(response)) {
  // response.data is typed correctly
  console.log(response.data)
}

if (isErrorResponse(response)) {
  // response.error is typed correctly
  console.error(response.error)
}
```

### Usage Example

```typescript
import { createListResponse } from '@/lib/api/types'
import type { GetExpensesResponse, Expense } from '@/lib/api/types'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { data, error } = await createExpenseQuery(supabase, user.id)
    .limit(100)
    .execute()

  if (error) throw new Error(error.message)

  // Create typed response
  const response: GetExpensesResponse = createListResponse(
    data || [],
    data?.length
  )

  return NextResponse.json({ expenses: response.data })
})
```

### Frontend Usage

```typescript
import type { GetExpensesResponse } from '@/lib/api/types'

async function fetchExpenses(): Promise<GetExpensesResponse> {
  const response = await fetch('/api/expenses')
  return response.json()
}

// TypeScript knows the exact shape of the response
const { data: expenses, count } = await fetchExpenses()
```

---

## Complete Migration Example

Here's a complete example showing middleware + query builder + typed responses:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'
import { createExpenseQuery } from '@/lib/api/query-builder'
import { createListResponse } from '@/lib/api/types'
import type { GetExpensesResponse } from '@/lib/api/types'

// ✅ Clean, type-safe, maintainable API route
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  // Parse query parameters
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build and execute query
  const { data, error } = await createExpenseQuery(supabase, user.id)
    .withFilters({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      category: searchParams.get('category') || undefined,
      merchant: searchParams.get('merchant') || undefined,
    })
    .limit(limit)
    .offset(offset)
    .execute()

  if (error) throw new Error(error.message)

  // Return typed response
  const response: GetExpensesResponse = createListResponse(
    data || [],
    data?.length
  )

  return NextResponse.json({ expenses: response.data })
})
```

**Code Reduction:**
- Before: ~45 lines
- After: ~25 lines
- Reduction: 44%

**Improvements:**
- ✅ Automatic auth handling
- ✅ Automatic error handling
- ✅ Reusable query logic
- ✅ Type-safe responses
- ✅ Consistent patterns

---

## Next Steps

1. ✅ Apply Pattern 1 to all remaining GET routes
2. ✅ Apply Pattern 2 to all POST/PUT routes with validation
3. ✅ Apply Pattern 3 to GET routes with query parameters
4. ✅ Migrate routes to use Query Builder (reduces boilerplate by ~40%)
5. ✅ Add typed responses for consistency
6. Run tests to ensure no regressions
7. Update frontend hooks to use typed responses
