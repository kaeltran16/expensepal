# Reliability Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the app against crashes, data loss, and inconsistent error handling across API routes, components, and hooks.

**Architecture:** Layer-by-layer: fix middleware infrastructure first, then migrate API routes to use it, then fix components, then hooks, then cleanup dead code. Each layer is independently testable.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zod, Supabase, TanStack React Query, Framer Motion

---

## File Structure

**New files:**
- `app/providers.tsx` — client component wrapping providers with ErrorBoundary
- `app/error.tsx` — Next.js route-level error boundary

**Modified infrastructure:**
- `lib/api/middleware.ts` — fix non-Error handling, add `withAuthParamsAndValidation`
- `lib/api/schemas.ts` — add new Zod schemas for missing entities

**Modified API routes (~35 handlers across ~30 files):**
- `app/api/expenses/route.ts` — wire up existing schema
- `app/api/budgets/route.ts`, `app/api/budgets/[id]/route.ts` — wire up schemas
- `app/api/goals/route.ts`, `app/api/goals/[id]/route.ts` — wire up schemas
- `app/api/meals/route.ts`, `app/api/meals/[id]/route.ts` — wire up schemas, fix mass assignment
- `app/api/workouts/route.ts`, `app/api/workouts/[id]/route.ts` — wire up schemas, fix partial creation
- `app/api/workout-templates/[id]/route.ts` — add validation
- `app/api/routines/route.ts` — add schema + validation
- `app/api/routine-templates/route.ts`, `app/api/routine-templates/[id]/route.ts` — add schemas
- `app/api/routine-steps/route.ts`, `app/api/routine-stats/route.ts`, `app/api/routine-streaks/route.ts` — add schemas
- `app/api/routine-journal/route.ts`, `app/api/routine-journal/[id]/route.ts` — add schemas
- `app/api/routine-challenges/[id]/route.ts` — add schema
- `app/api/scheduled-workouts/route.ts`, `app/api/scheduled-workouts/[id]/route.ts` — add schemas
- `app/api/notifications/subscribe/route.ts`, `app/api/notifications/unsubscribe/route.ts` — add schemas
- `app/api/settings/email/route.ts` — add schema
- `app/api/personal-records/route.ts` — add schema
- `app/api/achievements/route.ts` — add schema
- `app/api/exercise-favorites/route.ts` — add schema
- `app/api/streaks/route.ts` — add schema
- `app/api/ai/parse-input/route.ts` — add schema
- `app/api/ai-insights/route.ts` — add schema
- `app/api/custom-exercises/route.ts` — wire up schema for PUT
- `app/api/recurring-expenses/route.ts`, `app/api/recurring-expenses/[id]/route.ts`, `app/api/recurring-expenses/[id]/skip/route.ts`, `app/api/recurring-expenses/save-detected/route.ts` — add schemas
- `app/api/saved-foods/[id]/route.ts` — wire up existing schema
- `app/api/cardio-plans/[id]/route.ts` — add schema
- `app/api/workouts/generate/route.ts` — add schema

**Modified hooks:**
- `lib/hooks/use-workouts.ts` — fix `error.message` → `error.error`
- `lib/hooks/use-expenses.ts` — remove mutation-level toasts (delete, update)
- `lib/hooks/use-expense-operations.ts` — own all toasts

**Modified components:**
- `app/layout.tsx` — use `<Providers>` wrapper
- `app/page.tsx` — fix WorkoutLogger save, fix Web Share Target

**Deleted files:**
- `lib/hooks/use-offline-queue.ts`
- `components/offline-indicator.tsx`
- `__tests__/integration/offline-sync-flow.test.ts`
- `e2e/fixtures/offline.fixture.ts`

---

## Task 1: Fix `withAuth` non-Error handling

**Files:**
- Modify: `lib/api/middleware.ts:45-54`

Currently, `withAuth` catch block does `error instanceof Error ? error.message : 'Internal server error'`. Raw Supabase PostgrestError objects are not `Error` instances, so users get a generic message.

- [ ] **Step 1: Update `withAuth` catch block**

In `lib/api/middleware.ts`, replace the catch block at lines 45-54:

```ts
// Before:
} catch (error) {
  console.error('API Error:', error)

  const message = error instanceof Error ? error.message : 'Internal server error'
  return NextResponse.json(
    { error: message },
    { status: 500 }
  )
}

// After:
} catch (error) {
  console.error('API Error:', error)

  const message = error instanceof Error
    ? error.message
    : (typeof error === 'object' && error !== null && 'message' in error)
      ? String((error as { message: unknown }).message)
      : 'Internal server error'
  return NextResponse.json(
    { error: message },
    { status: 500 }
  )
}
```

Apply the same fix to `withOptionalAuth` catch block at lines 83-91.

- [ ] **Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```
fix(middleware): handle non-Error throws in withAuth catch block
```

---

## Task 2: Create `withAuthParamsAndValidation` helper

**Files:**
- Modify: `lib/api/middleware.ts`

Dynamic `[id]` routes need both URL param extraction and body validation. The codebase already has a local `withAuthParams` helper in `workout-templates/[id]/route.ts` and `scheduled-workouts/[id]/route.ts`. Create a shared version that also supports Zod validation.

- [ ] **Step 1: Add `withAuthParamsAndValidation` to middleware.ts**

Append to `lib/api/middleware.ts` before the `safeParseJSON` function:

```ts
export function withAuthParamsAndValidation<TParams, TSchema extends z.ZodType>(
  schema: TSchema,
  handler: (
    request: NextRequest,
    user: User,
    params: TParams,
    validatedData: z.infer<TSchema>
  ) => Promise<Response>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ) => {
    const resolvedParams = await context.params
    return withAuthAndValidation(schema, async (req, user, validatedData) => {
      return handler(req, user, resolvedParams, validatedData)
    })(request)
  }
}
```

Also add a params-only version for routes that don't need body validation (DELETE handlers, etc.):

```ts
export function withAuthParams<TParams>(
  handler: (request: NextRequest, user: User, params: TParams) => Promise<Response>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ) => {
    const resolvedParams = await context.params
    return withAuth((req, user) => handler(req, user, resolvedParams))(request)
  }
}
```

- [ ] **Step 2: Export from middleware**

Ensure both new functions are exported (they are, since `export function` is used).

- [ ] **Step 3: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```
feat(middleware): add withAuthParamsAndValidation for dynamic routes
```

---

## Task 3: Add new Zod schemas

**Files:**
- Modify: `lib/api/schemas.ts`

Add schemas for entities that don't have them yet. These are needed before routes can be migrated.

- [ ] **Step 1: Add schemas to `lib/api/schemas.ts`**

Append after the Saved Foods section (after line 256):

```ts
// ============================================================================
// Routine Schemas
// ============================================================================

export const CreateRoutineCompletionSchema = z.object({
  template_id: z.string().uuid().optional(),
  routine_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time_of_day: z.enum(['morning', 'afternoon', 'evening', 'any']).optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  duration_minutes: z.number().nonnegative().optional(),
  steps_completed: z.number().nonnegative().optional(),
  xp_earned: z.number().nonnegative().optional(),
  bonus_xp: z.number().nonnegative().optional(),
})

export const CreateRoutineTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  time_of_day: z.enum(['morning', 'afternoon', 'evening', 'any']).optional(),
  estimated_minutes: z.number().positive().optional(),
  steps: z.array(z.object({
    step_id: z.string().optional(),
    name: z.string(),
    duration_seconds: z.number().nonnegative().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  frequency: z.object({ type: z.string() }).optional(),
})

export const UpdateRoutineTemplateSchema = CreateRoutineTemplateSchema.partial()

export const CreateCustomRoutineStepSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  tips: z.string().max(1000).optional(),
  image_url: z.string().url().optional(),
  gif_url: z.string().url().optional(),
  category: z.string().max(50).optional(),
  duration_seconds: z.number().positive().default(60),
})

export const UpdateRoutineStatsSchema = z.object({
  add_xp: z.number().nonnegative().optional(),
  total_xp: z.number().nonnegative().optional(),
  current_level: z.number().positive().optional(),
  lifetime_routines: z.number().nonnegative().optional(),
  perfect_weeks: z.number().nonnegative().optional(),
})

export const UpdateRoutineStreakSchema = z.object({
  current_streak: z.number().nonnegative().optional(),
  longest_streak: z.number().nonnegative().optional(),
  last_routine_date: z.string().optional(),
  total_completions: z.number().nonnegative().optional(),
})

export const CreateJournalEntrySchema = z.object({
  routine_completion_id: z.string().uuid().optional(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  energy_level: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
})

export const UpdateJournalEntrySchema = z.object({
  mood: z.number().int().min(1).max(5).optional(),
  energy_level: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
})

export const ChallengeActionSchema = z.object({
  action: z.enum(['update_progress', 'claim']).optional(),
  increment_by: z.number().positive().optional(),
})

// ============================================================================
// Scheduled Workout Schemas
// ============================================================================

export const CreateScheduledWorkoutSchema = z.object({
  template_id: z.string().uuid().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduled_date is required'),
  notes: z.string().max(500).optional(),
})

export const UpdateScheduledWorkoutSchema = z.object({
  template_id: z.string().uuid().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['scheduled', 'completed', 'skipped']).optional(),
  notes: z.string().max(500).optional(),
  completed_workout_id: z.string().uuid().optional(),
})

// ============================================================================
// Notification Schemas
// ============================================================================

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
})

export const UnsubscribeSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
})

// ============================================================================
// Settings Schemas
// ============================================================================

export const EmailSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  email_address: z.string().email('Valid email is required'),
  app_password: z.string().min(1, 'App password is required'),
  imap_host: z.string().default('imap.gmail.com'),
  imap_port: z.number().int().min(1).max(65535).default(993),
  imap_tls: z.boolean().default(true),
  is_enabled: z.boolean().default(true),
  trusted_senders: z.array(z.string()).optional(),
})

// ============================================================================
// Personal Record Schema
// ============================================================================

export const CreatePersonalRecordSchema = z.object({
  exercise_id: z.string().uuid(),
  record_type: z.enum(['1rm', 'max_reps', 'max_volume', 'max_weight']),
  value: z.number().positive(),
  unit: z.string().max(20).optional(),
  achieved_at: z.string().datetime().optional(),
  workout_exercise_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

// ============================================================================
// Achievement Schema
// ============================================================================

export const UnlockAchievementSchema = z.object({
  achievementType: z.string().min(1, 'achievementType is required'),
})

// ============================================================================
// Exercise Favorite Schema
// ============================================================================

export const ExerciseFavoriteSchema = z.object({
  exercise_id: z.string().uuid('Valid exercise_id is required'),
})

// ============================================================================
// Workout Update / Generate Schemas
// ============================================================================

export const UpdateWorkoutSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  completed_at: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

export const GenerateWorkoutSchema = z.object({
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  target_goal: z.enum(['strength', 'hypertrophy', 'endurance', 'general_fitness']).optional(),
  duration_minutes: z.number().positive().optional(),
  muscle_groups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
})

// ============================================================================
// Recurring Expense Schemas
// ============================================================================

export const CreateRecurringExpenseSchema = z.object({
  merchant: z.string().min(1, 'Merchant is required'),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
})

export const UpdateRecurringExpenseSchema = z.object({
  merchant: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
})

export const SkipRecurringExpenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required'),
})

export const SaveDetectedExpensesSchema = z.object({
  expense_ids: z.array(z.string()).min(1, 'At least one expense ID is required'),
})

// ============================================================================
// Goal Update Schema (with field mapping)
// ============================================================================

export const UpdateGoalWithMappingSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().nonnegative().optional(),
  target_amount: z.number().positive().optional(),
  current_amount: z.number().nonnegative().optional(),
  deadline: z.string().optional(),
  icon: z.string().max(10).optional(),
})

// ============================================================================
// Budget Update Schema
// ============================================================================

export const UpdateBudgetAmountSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
})

// ============================================================================
// Cardio Plan Update Schema
// ============================================================================

export const UpdateCardioPlanSchema = z.object({
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  current_week: z.number().positive().optional(),
  current_session: z.number().positive().optional(),
})

// ============================================================================
// Workout Template Update Schema
// ============================================================================

export const UpdateWorkoutTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration_minutes: z.number().positive().optional(),
  exercises: z.array(z.object({
    exercise_id: z.string().uuid(),
    name: z.string().optional(),
    sets: z.number().positive().int(),
    reps: z.union([z.number().positive().int(), z.string()]),
    rest: z.number().nonnegative().default(60),
    notes: z.string().optional(),
    image_url: z.string().nullable().optional(),
    gif_url: z.string().nullable().optional(),
    order: z.number().nonnegative().int().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  target_goal: z.enum(['strength', 'hypertrophy', 'endurance', 'general_fitness']).optional(),
})

// ============================================================================
// AI Schemas
// ============================================================================

export const ParseInputSchema = z.object({
  input: z.string().min(1, 'Input text is required'),
})

export const AIInsightsSchema = z.object({
  expenses: z.array(z.any()),
  budgets: z.array(z.any()).optional(),
  timeRange: z.enum(['week', 'month', 'quarter']).optional(),
})

// ============================================================================
// Streak Update Schema
// ============================================================================

export const UpdateStreakSchema = z.object({
  type: z.enum(['workout', 'meal']).optional(),
  current_streak: z.number().nonnegative().optional(),
  longest_streak: z.number().nonnegative().optional(),
  last_activity_date: z.string().optional(),
})

// ============================================================================
// Custom Exercise Update Schema
// ============================================================================

export const UpdateCustomExerciseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).optional(),
  muscle_group: z.string().optional(),
  equipment: z.string().optional(),
  instructions: z.string().max(1000).optional(),
})
```

Add type exports at the bottom:

```ts
export type CreateRoutineCompletionInput = z.infer<typeof CreateRoutineCompletionSchema>
export type CreateRoutineTemplateInput = z.infer<typeof CreateRoutineTemplateSchema>
export type CreateScheduledWorkoutInput = z.infer<typeof CreateScheduledWorkoutSchema>
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass (new schemas are not used yet).

- [ ] **Step 3: Commit**

```
feat(schemas): add Zod validation schemas for all API entities
```

---

## Task 4: Migrate Phase 1 routes (simple POST with existing schemas)

**Files:**
- Modify: `app/api/expenses/route.ts`
- Modify: `app/api/budgets/route.ts`
- Modify: `app/api/goals/route.ts`
- Modify: `app/api/meals/route.ts`
- Modify: `app/api/recurring-expenses/route.ts`
- Modify: `app/api/custom-exercises/route.ts` (PUT handler)

Each route replaces `withAuth(async (request, user) => { const body = await request.json() ... })` with `withAuthAndValidation(Schema, async (request, user, validatedData) => { ... })`.

- [ ] **Step 1: Migrate `app/api/expenses/route.ts` POST**

Replace the POST handler (starting around line 86 in the current file):

```ts
import { withAuth, withAuthAndValidation, safeParseJSON } from '@/lib/api/middleware'
import { CreateExpenseSchema } from '@/lib/api/schemas'

// POST create new expense
export const POST = withAuthAndValidation(
  CreateExpenseSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          user_id: user.id,
          transaction_type: validatedData.transaction_type || 'Expense',
          amount: validatedData.amount,
          currency: validatedData.currency,
          transaction_date: validatedData.transaction_date,
          merchant: validatedData.merchant,
          category: validatedData.category,
          notes: validatedData.notes,
          source: validatedData.source,
          email_subject: validatedData.email_subject,
        },
      ])
      .select()

    if (error) {
      console.error('Failed to create expense:', error)
      throw new Error('Failed to create expense')
    }

    const createdExpense = data[0]

    // ... rest of the meal auto-creation and budget threshold logic stays the same
    // but use validatedData.category, validatedData.merchant, etc.
```

The meal auto-creation block and budget threshold check remain unchanged except using `validatedData` instead of `body`.

- [ ] **Step 2: Migrate `app/api/budgets/route.ts` POST**

```ts
import { withAuth, withAuthAndValidation, safeParseJSON } from '@/lib/api/middleware'
import { CreateBudgetSchema } from '@/lib/api/schemas'

export const POST = withAuthAndValidation(
  CreateBudgetSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('budgets')
      .insert([
        {
          user_id: user.id,
          category: validatedData.category,
          amount: validatedData.amount,
          month: validatedData.month,
          alert_threshold: validatedData.alert_threshold,
        },
      ])
      .select()

    if (error) {
      console.error('Failed to create budget:', error)
      throw new Error('Failed to create budget')
    }

    return NextResponse.json({ budget: data[0] }, { status: 201 })
  }
)
```

- [ ] **Step 3: Migrate `app/api/goals/route.ts` POST**

Replace `safeParseJSON` + manual checks with `withAuthAndValidation`. The schema uses `targetAmount` (camelCase) to match the frontend. Create a mapped schema or keep the manual field mapping in the handler:

```ts
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { z } from 'zod'

const CreateGoalInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  targetAmount: z.number().positive('Target amount must be positive'),
  currentAmount: z.number().nonnegative().default(0),
  deadline: z.string().optional(),
  icon: z.string().max(10).default('🎯'),
})

export const POST = withAuthAndValidation(
  CreateGoalInputSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('savings_goals')
      .insert([
        {
          user_id: user.id,
          name: validatedData.name,
          target_amount: validatedData.targetAmount,
          current_amount: validatedData.currentAmount,
          deadline: validatedData.deadline,
          icon: validatedData.icon,
        },
      ])
      .select()

    if (error) {
      console.error('Failed to create goal:', error)
      throw new Error('Failed to create goal')
    }

    return NextResponse.json({ goal: data[0] }, { status: 201 })
  }
)
```

Note: inline the schema here since the shared schema uses different field names. Don't add this to `schemas.ts` to avoid confusion.

- [ ] **Step 4: Migrate `app/api/meals/route.ts` POST**

The meals POST is complex (LLM estimation, multiple code paths). Wrap the initial body parsing with `withAuthAndValidation` using an extended schema:

```ts
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { z } from 'zod'

const CreateMealInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  calories: z.number().positive().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  meal_time: z.string().optional(),
  meal_date: z.string().min(1, 'meal_date is required'),
  expense_id: z.string().optional(),
  notes: z.string().max(500).optional(),
  estimate: z.boolean().optional(),
  portionSize: z.string().optional(),
})

export const POST = withAuthAndValidation(
  CreateMealInputSchema,
  async (request, user, body) => {
    // ... existing handler logic using `body` instead of destructured body
    // Remove the `if (!name || !meal_date)` check — Zod handles it
```

The rest of the handler stays the same, using `body.name`, `body.meal_date`, etc.

- [ ] **Step 5: Migrate `app/api/recurring-expenses/route.ts` POST**

Replace `safeParseJSON` + manual checks with `withAuthAndValidation(CreateRecurringExpenseSchema, ...)`.

- [ ] **Step 6: Migrate `app/api/custom-exercises/route.ts` PUT**

The POST already uses `withAuthAndValidation`. The PUT at the bottom of the file uses `withAuth` + `request.json()`. Change to:

```ts
export const PUT = withAuthAndValidation(
  UpdateCustomExerciseSchema,
  async (request, user, validatedData) => {
    // ... use validatedData instead of body
  }
)
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass (tests mock fetch, so server changes don't affect them).

- [ ] **Step 8: Commit**

```
refactor(api): migrate Phase 1 routes to withAuthAndValidation + Zod
```

---

## Task 5: Migrate Phase 2 — dynamic `[id]` routes (fix mass assignment)

**Files:**
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `app/api/saved-foods/[id]/route.ts`
- Modify: `app/api/expenses/[id]/route.ts`
- Modify: `app/api/budgets/[id]/route.ts`
- Modify: `app/api/goals/[id]/route.ts`
- Modify: `app/api/workouts/[id]/route.ts`
- Modify: `app/api/workout-templates/[id]/route.ts`
- Modify: `app/api/recurring-expenses/[id]/route.ts`
- Modify: `app/api/recurring-expenses/[id]/skip/route.ts`
- Modify: `app/api/routine-templates/[id]/route.ts`
- Modify: `app/api/routine-journal/[id]/route.ts`
- Modify: `app/api/routine-challenges/[id]/route.ts`
- Modify: `app/api/cardio-plans/[id]/route.ts`
- Modify: `app/api/scheduled-workouts/[id]/route.ts`
- Modify: `app/api/custom-exercises/[id]/route.ts` (if exists)

- [ ] **Step 1: Fix meals/[id] mass assignment**

Replace `app/api/meals/[id]/route.ts` entirely:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthParamsAndValidation } from '@/lib/api/middleware'
import { UpdateMealSchema } from '@/lib/api/schemas'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateMealSchema,
    async (req, user, params, validatedData) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('meals')
        .update(validatedData)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update meal:', error)
        throw new Error('Failed to update meal')
      }

      return NextResponse.json(data)
    }
  )(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params
    const supabase = createClient()

    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete meal:', error)
      throw new Error('Failed to delete meal')
    }

    return NextResponse.json({ success: true })
  })(request)
}
```

- [ ] **Step 2: Wire up saved-foods/[id] PUT**

The file already imports `withAuthAndValidation` and `UpdateSavedFoodSchema` but doesn't use them. Replace the PUT handler to use the schema. Since this route extracts ID from URL rather than params, use `withAuthAndValidation` directly:

```ts
export const PUT = withAuthAndValidation(
  UpdateSavedFoodSchema,
  async (request: NextRequest, user, validatedData) => {
    const id = request.url.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: 'Saved food ID is required' }, { status: 400 })
    }

    const supabase = createClient()
    const updates = { ...validatedData }

    if (validatedData.use_count !== undefined || request.headers.get('x-increment-use')) {
      // keep the increment logic for backward compat
    }

    const { data, error } = await supabase
      .from('saved_foods')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update saved food:', error)
      throw new Error('Failed to update saved food')
    }

    return NextResponse.json(data)
  }
)
```

Note: The `increment_use` feature needs careful handling. If the hook sends `increment_use: true`, the schema won't validate it. Add `increment_use: z.boolean().optional()` to `UpdateSavedFoodSchema` in schemas.ts, then handle it in the handler.

- [ ] **Step 3: Migrate remaining `[id]` routes**

Apply the same pattern to all other `[id]` routes. For each:

1. Replace local `withAuthParams` imports with `import { withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'`
2. Import the appropriate schema from `@/lib/api/schemas`
3. Change PUT handlers to use `withAuthParamsAndValidation(Schema, async (req, user, params, validatedData) => { ... })`
4. DELETE handlers can use `withAuthParams` (no body to validate)
5. Replace `error.message` leakage with `console.error(...)` + `throw new Error('Failed to ...')`

Key replacements per file:

| File | Schema | Notes |
|------|--------|-------|
| `expenses/[id]` | `UpdateExpenseSchema` | Has meal sync side effects, keep those |
| `budgets/[id]` | `UpdateBudgetAmountSchema` | Only updates amount |
| `goals/[id]` | `UpdateGoalWithMappingSchema` | Map `targetAmount` → `target_amount` in handler |
| `workouts/[id]` | `UpdateWorkoutSchema` | Simple status/completed_at update |
| `workout-templates/[id]` | `UpdateWorkoutTemplateSchema` | Keep is_default check logic |
| `recurring-expenses/[id]` | `UpdateRecurringExpenseSchema` | |
| `recurring-expenses/[id]/skip` | `SkipRecurringExpenseSchema` | POST with just date |
| `routine-templates/[id]` | `UpdateRoutineTemplateSchema` | Keep is_default check |
| `routine-journal/[id]` | `UpdateJournalEntrySchema` | Whitelists mood, energy, notes, tags |
| `routine-challenges/[id]` | `ChallengeActionSchema` | Keep claim/update logic |
| `cardio-plans/[id]` | `UpdateCardioPlanSchema` | Simple status update |
| `scheduled-workouts/[id]` | `UpdateScheduledWorkoutSchema` | Keep ownership check |

- [ ] **Step 4: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```
refactor(api): migrate dynamic [id] routes to withAuthParamsAndValidation

- Fix mass assignment in meals/[id] PUT
- Wire up saved-foods/[id] existing schema
- Add Zod validation to all [id] PUT handlers
```

---

## Task 6: Migrate Phase 3 — Workout system routes

**Files:**
- Modify: `app/api/workouts/route.ts` (POST)
- Modify: `app/api/workouts/generate/route.ts` (POST)
- Modify: `app/api/exercise-favorites/route.ts` (POST)
- Modify: `app/api/personal-records/route.ts` (POST)

- [ ] **Step 1: Migrate `workouts/route.ts` POST**

```ts
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateWorkoutSchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ... GET stays the same ...

export const POST = withAuthAndValidation(
  CreateWorkoutSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()

    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        template_id: validatedData.template_id,
        workout_date: validatedData.date,
        started_at: validatedData.date,
        completed_at: validatedData.date,
        duration_minutes: validatedData.duration_minutes,
        notes: validatedData.notes,
      })
      .select()
      .single()

    if (workoutError) {
      console.error('Failed to create workout:', workoutError)
      throw new Error('Failed to save workout')
    }

    if (validatedData.exercises_completed && validatedData.exercises_completed.length > 0) {
      const exercisesToInsert = validatedData.exercises_completed.map((log, index) => ({
        workout_id: workout.id,
        exercise_id: log.exercise_id,
        exercise_order: index,
        sets: log.sets,
        notes: log.notes,
      }))

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(exercisesToInsert)

      if (exercisesError) {
        console.error('Failed to insert exercises, cleaning up workout:', exercisesError)
        await supabase.from('workouts').delete().eq('id', workout.id)
        throw new Error('Failed to save workout exercises')
      }
    }

    return NextResponse.json({ workout })
  }
)
```

Note: This also fixes the partial workout creation issue (Task 9 in spec — cleanup on exercise failure).

- [ ] **Step 2: Migrate other workout routes**

- `workouts/generate/route.ts`: Add `GenerateWorkoutSchema` validation
- `exercise-favorites/route.ts`: Add `ExerciseFavoriteSchema` validation
- `personal-records/route.ts`: Add `CreatePersonalRecordSchema` validation

Each follows the same pattern: `withAuth` → `withAuthAndValidation`, `request.json()` → `validatedData`.

- [ ] **Step 3: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 4: Commit**

```
refactor(api): migrate workout system routes to Zod validation
```

---

## Task 7: Migrate Phase 4 — Routine system routes

**Files:**
- Modify: `app/api/routines/route.ts` (POST)
- Modify: `app/api/routine-templates/route.ts` (POST)
- Modify: `app/api/routine-steps/route.ts` (POST)
- Modify: `app/api/routine-stats/route.ts` (POST)
- Modify: `app/api/routine-streaks/route.ts` (POST)
- Modify: `app/api/routine-journal/route.ts` (POST)
- Modify: `app/api/ai-insights/route.ts` (POST)

- [ ] **Step 1: Migrate each routine route POST**

Apply `withAuthAndValidation` + the corresponding schema from Task 3 to each route's POST handler. Key notes:

- `routines/route.ts` POST has side effects (achievements, push notifications, gamification). Keep all that logic, just replace body parsing with `validatedData`.
- `routine-stats/route.ts` POST has upsert logic. Keep it, use `validatedData` fields.
- `routine-streaks/route.ts` POST has upsert logic. Keep it.

- [ ] **Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 3: Commit**

```
refactor(api): migrate routine system routes to Zod validation
```

---

## Task 8: Migrate Phase 5 — Remaining routes

**Files:**
- Modify: `app/api/scheduled-workouts/route.ts` (POST)
- Modify: `app/api/notifications/subscribe/route.ts` (POST)
- Modify: `app/api/notifications/unsubscribe/route.ts` (POST)
- Modify: `app/api/settings/email/route.ts` (POST)
- Modify: `app/api/achievements/route.ts` (POST)
- Modify: `app/api/streaks/route.ts` (POST)
- Modify: `app/api/ai/parse-input/route.ts` (POST)
- Modify: `app/api/recurring-expenses/save-detected/route.ts` (POST)

- [ ] **Step 1: Fix notifications/subscribe crash**

Replace the entire file:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthAndValidation } from '@/lib/api/middleware'
import { PushSubscriptionSchema } from '@/lib/api/schemas'

export const POST = withAuthAndValidation(
  PushSubscriptionSchema,
  async (request, user, subscription) => {
    const supabase = createClient()

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: request.headers.get('user-agent'),
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Failed to store subscription:', error)
      throw new Error('Failed to store subscription')
    }

    return NextResponse.json({ success: true })
  }
)
```

- [ ] **Step 2: Migrate remaining routes**

Each follows the same pattern. For `notifications/unsubscribe`, use `UnsubscribeSchema`. For `settings/email`, use `EmailSettingsSchema`. For `achievements`, use `UnlockAchievementSchema`. For `streaks`, use `UpdateStreakSchema`. For `ai/parse-input`, use `ParseInputSchema`. For `recurring-expenses/save-detected`, use `SaveDetectedExpensesSchema`.

- [ ] **Step 3: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 4: Commit**

```
refactor(api): migrate remaining routes to Zod validation

- Fix notifications/subscribe crash on malformed input
- Add validation to settings/email, achievements, streaks, AI routes
```

---

## Task 9: Replace Supabase error leakage across all routes

**Files:**
- All API routes that do `throw new Error(error.message)` or `return NextResponse.json({ error: error.message })`

This was partially done in Tasks 4-8 during migration. This task catches any remaining routes.

- [ ] **Step 1: Find remaining `error.message` leaks**

Run: `rg "error\.message" app/api/ --type ts`

For each result:
- If it's `throw new Error(error.message)`: replace with `console.error('Failed to <verb> <resource>:', error)` + `throw new Error('Failed to <verb> <resource>')`
- If it's `{ error: error.message }`: replace with `console.error(...)` + `{ error: 'Failed to <verb> <resource>' }`

Exception: routes already migrated in Tasks 4-8 which already use generic messages.

- [ ] **Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 3: Commit**

```
fix(api): replace Supabase error message leakage with generic messages
```

---

## Task 10: Add global error boundary + `app/error.tsx`

**Files:**
- Create: `app/providers.tsx`
- Create: `app/error.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `app/providers.tsx`**

```tsx
'use client'

import { ErrorBoundary } from '@/components/error-boundary'
import { AuthProvider } from '@/components/auth-provider'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { QueryProvider } from '@/components/query-provider'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      errorTitle="Something went wrong"
      errorDescription="The app encountered an unexpected error. Please try refreshing."
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <QueryProvider>
          <AuthProvider>
            <ServiceWorkerRegistration />
            {children}
            <PWAInstallPrompt />
            <Toaster
              position="top-center"
              richColors
              closeButton
              toastOptions={{
                style: {
                  marginTop: 'max(env(safe-area-inset-top), 1rem)',
                }
              }}
            />
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
```

- [ ] **Step 2: Create `app/error.tsx`**

```tsx
'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        An error occurred while loading this page.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        Try again
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Update `app/layout.tsx`**

Replace the provider tree (lines 166-191) with:

```tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} />
            <link rel="dns-prefetch" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} />
          </>
        )}
        <link rel="icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180x180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ExpensePal" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

Remove the old provider imports (`AuthProvider`, `QueryProvider`, `ThemeProvider`, `PWAInstallPrompt`, `ServiceWorkerRegistration`, `Toaster`) from `layout.tsx`.

- [ ] **Step 4: Run build**

Run: `npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```
feat(error): add global error boundary and app/error.tsx

Extract providers into client component for ErrorBoundary wrapping.
```

---

## Task 11: Fix WorkoutLogger save data loss

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Wrap `createWorkout` in try/catch**

In `app/page.tsx`, find the `WorkoutLogger` `onComplete` prop (around line 722). Change from:

```ts
onComplete={async (workoutData) => {
  // ... builds apiData from workoutData ...
  await createWorkout(apiData)
  setActiveWorkout(undefined)
  setExerciseLogs([])
}}
```

To:

```ts
onComplete={async (workoutData) => {
  try {
    // ... builds apiData from workoutData (keep existing logic) ...
    await createWorkout(apiData)
    setActiveWorkout(undefined)
    setExerciseLogs([])
  } catch (error) {
    console.error('Failed to save workout:', error)
    toast.error('Failed to save workout. Your data is preserved — please try again.')
  }
}}
```

The `toast` import already exists at the top of the file.

- [ ] **Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 3: Commit**

```
fix(workouts): prevent data loss on workout save failure
```

---

## Task 12: Fix Web Share Target handler

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace nested .then() chain with async/await**

Find the Web Share Target handler (around lines 289-331). Replace the nested `.then().then().then().catch()` chain with:

```ts
useEffect(() => {
  if ('serviceWorker' in navigator && 'sharedData' in window) {
    const handleShare = async () => {
      try {
        const cache = await caches.open('shared-data-v1')
        const response = await cache.match('shared-expense')
        if (!response) return

        const data = await response.json()
        await cache.delete('shared-expense')

        if (data.description || data.title) {
          setShowNLInput(true)
        }
      } catch (error) {
        console.error('Failed to handle shared data:', error)
        toast.error('Failed to process shared data')
      }
    }
    handleShare()
  }
}, [])
```

Note: Adjust the exact implementation based on what the current handler does — read the existing code carefully and preserve all the logic, just flatten the promise chain.

- [ ] **Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 3: Commit**

```
refactor(share): flatten Web Share Target promise chain with async/await
```

---

## Task 13: Fix `error.message` bug in `use-workouts.ts`

**Files:**
- Modify: `lib/hooks/use-workouts.ts`

- [ ] **Step 1: Replace all `error.message` with `error.error`**

In `lib/hooks/use-workouts.ts`, there are 8 mutation functions that read `error.message` from the JSON response. Each has this pattern:

```ts
const error = await res.json()
throw new Error(error.message || 'fallback')
```

Change all 8 to:

```ts
const error = await res.json()
throw new Error(error.error || 'fallback')
```

Specific line replacements:
- Line 104: `error.message` → `error.error`
- Line 148: `error.message` → `error.error`
- Line 192: `error.message` → `error.error`
- Line 269: `error.message` → `error.error`
- Line 300: `error.message` → `error.error`
- Line 342: `error.message` → `error.error`
- Line 370: `error.message` → `error.error`
- Line 483: `error.message` → `error.error`

Use `replaceAll` since the pattern `error.message ||` appears consistently.

- [ ] **Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 3: Commit**

```
fix(hooks): read error.error from API responses in workout mutations
```

---

## Task 14: Fix double toast notifications

**Files:**
- Modify: `lib/hooks/use-expenses.ts`
- Modify: `lib/hooks/use-expense-operations.ts`

The fix: remove mutation-level toasts from `useDeleteExpenseOptimistic` and `useUpdateExpense`, let call sites own their toasts. Update `handleSubmit` to add its own success toast for updates.

- [ ] **Step 1: Remove toast from `useDeleteExpenseOptimistic`**

In `lib/hooks/use-expenses.ts`, find `useDeleteExpenseOptimistic` (line 333). Remove the `onSuccess` toast at line 361:

```ts
// Before:
onSuccess: () => {
  toast.success('Expense deleted')
},

// After:
onSuccess: () => {
  // Toast handled by call site (useExpenseOperations)
},
```

Actually, just remove the `toast.success('Expense deleted')` line. Keep the `onSuccess` empty or remove the entire callback.

- [ ] **Step 2: Remove toast from `useUpdateExpense`**

In `lib/hooks/use-expenses.ts`, find `useUpdateExpense` (line 226). Remove the toast from `onSuccess` at line 234:

```ts
// Before:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
  toast.success('Expense updated successfully')
},

// After:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
},
```

- [ ] **Step 3: Update `handleSubmit` in `use-expense-operations.ts` to show its own update toast**

In `lib/hooks/use-expense-operations.ts`, find `handleSubmit` (line 109). After the `await updateExpenseMutation.mutateAsync(...)` call on line 133, add a success toast:

```ts
if (editingExpense) {
  await updateExpenseMutation.mutateAsync({
    id: editingExpense.id,
    updates: data,
  })
  toast.success('Expense updated')
} else {
  await createExpenseMutation.mutateAsync({
    ...data,
    source: 'manual',
  })
  // createExpenseMutation already shows "Expense added!" toast
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 5: Commit**

```
fix(expenses): eliminate double toast notifications on delete and update
```

---

## Task 15: Remove offline queue code

**Files:**
- Delete: `lib/hooks/use-offline-queue.ts`
- Delete: `components/offline-indicator.tsx`
- Delete: `__tests__/integration/offline-sync-flow.test.ts`
- Delete: `e2e/fixtures/offline.fixture.ts`
- Modify: `lib/hooks/index.ts` (remove lines 102-104)
- Modify: `e2e/tests/mobile/mobile-interactions.spec.ts` (remove skipped offline test)

- [ ] **Step 1: Remove barrel exports**

In `lib/hooks/index.ts`, remove lines 102-104:

```ts
// Remove these:
// Offline Mode
export { useOfflineQueue } from './use-offline-queue'
export type { PendingMutation } from './use-offline-queue'
```

- [ ] **Step 2: Delete files**

Delete these files:
- `lib/hooks/use-offline-queue.ts`
- `components/offline-indicator.tsx`
- `__tests__/integration/offline-sync-flow.test.ts`
- `e2e/fixtures/offline.fixture.ts`

- [ ] **Step 3: Remove skipped offline e2e test**

In `e2e/tests/mobile/mobile-interactions.spec.ts`, find and remove the `test.skip` block for offline functionality.

- [ ] **Step 4: Verify no remaining imports**

Run: `rg "use-offline-queue|useOfflineQueue|OfflineIndicator|offline-sync-flow|offline\.fixture" --type ts`
Expected: No results.

- [ ] **Step 5: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 6: Commit**

```
chore: remove unused offline queue code and consumers
```

---

## Task 16: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass.

- [ ] **Step 2: Run build**

Run: `npx next build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Run lint**

Run: `npx next lint`
Expected: No new lint errors.

- [ ] **Step 4: Verify no Supabase error leakage**

Run: `rg "throw new Error\(error\.message\)" app/api/ --type ts`
Expected: No results (all replaced with generic messages).

- [ ] **Step 5: Verify no `error.message` in workout hooks**

Run: `rg "error\.message \|\|" lib/hooks/use-workouts.ts`
Expected: No results (all changed to `error.error`).
