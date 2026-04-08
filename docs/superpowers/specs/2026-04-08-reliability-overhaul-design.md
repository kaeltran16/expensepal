# Comprehensive Reliability Overhaul

**Date**: 2026-04-08
**Status**: In Review
**Scope**: API validation, error handling, component resilience, hook consistency

## Problem

The app has grown rapidly with inconsistent error handling patterns across layers. Specific issues:

- **Security vulnerability**: `meals/[id]` PUT passes entire request body to Supabase update (mass assignment)
- **~35 POST/PUT handlers** across API routes lack Zod input validation, accepting unvalidated data
- **No global error boundary** — provider crashes show white screen; no `app/error.tsx` exists
- **Inconsistent error responses** — routes use both `throw` and `return NextResponse.json()` with different status codes
- **Frontend error key mismatch** — `use-workouts.ts` (8 mutations) and `use-routines.ts` (13 mutations) read `error.message` from API responses instead of `error.error`, always showing hardcoded fallbacks instead of actual server messages
- **Double toast notifications** on expense note updates and expense deletes
- **WorkoutLogger** unmounts on tab switch during active workout (losing position state), and the `onComplete` callback clears state on save failure
- **`withAuth`** handles non-Error throws (raw Supabase PostgrestError) poorly, returning generic "Internal server error" instead of the actual message
- **Dead offline queue code** — `use-offline-queue.ts` is imported by `offline-indicator.tsx` and integration tests but never connected to any mutation hook

## Approach

Systematic layer-by-layer: fix each layer completely before moving to the next. Each layer is independently testable. Routes can be migrated one-by-one with no ordering dependencies within a phase.

Offline-first mutation queueing is out of scope. The offline queue code will be cleaned up (removed along with its consumers).

---

## Section 1: API Layer Hardening

### 1a. Migrate all routes to `withAuthAndValidation` + Zod schemas

11 routes already use `withAuthAndValidation` (weight, categories, calorie-goals, profile, cardio-plans, cardio-sessions, water, saved-foods POST, workout-templates POST, custom-exercises POST, ai/generate-cardio-plan). The remaining ~35 POST/PUT handlers use raw `request.json()` with manual field checks or `safeParseJSON`.

Existing Zod schemas in `lib/api/schemas.ts` cover: expenses, budgets, goals, meals, workouts, workout templates, custom exercises, profile, calorie goals, categories, weight logs, water logs, saved foods. **New schemas must be authored for**: routines, routine-templates, routine-steps, routine-stats, routine-streaks, routine-journal, routine-challenges, scheduled-workouts, recurring-expenses (save-detected, skip), personal-records, achievements, streaks, exercise-favorites, notifications (subscribe/unsubscribe).

**Dynamic `[id]` routes need special handling.** `withAuthAndValidation` has no mechanism for URL params. Three param access patterns exist in the codebase. Create a `withAuthParamsAndValidation` helper (or extend `withAuthAndValidation` to accept a `params` handler) to handle `context.params` extraction alongside body validation. This affects: `meals/[id]`, `workouts/[id]`, `workout-templates/[id]`, `budgets/[id]`, `goals/[id]`, `expenses/[id]`, `routines/[id]`, `routine-templates/[id]`, `routine-journal/[id]`, `routine-challenges/[id]`, `cardio-plans/[id]`, `recurring-expenses/[id]`, `scheduled-workouts/[id]`, `saved-foods/[id]`, `custom-exercises/[id]`.

Routes to migrate (grouped by phase):

**Phase 1 — Independent POST routes with existing schemas:**
- `expenses/route.ts` (POST) — has `CreateExpenseSchema`, uses `safeParseJSON` + manual checks, wire up schema
- `budgets/route.ts` (POST) — has `CreateBudgetSchema`, uses `safeParseJSON`, wire up schema
- `goals/route.ts` (POST) — has `CreateGoalSchema`, uses `safeParseJSON`, wire up schema
- `meals/route.ts` (POST) — has `CreateMealSchema`, uses raw `request.json()`, wire up schema
- `recurring-expenses/route.ts` (POST) — uses `safeParseJSON` + manual checks, author schema
- `custom-exercises/route.ts` (PUT) — has schema for POST already, uses raw `request.json()` for PUT

**Phase 2 — Dynamic `[id]` routes (after param helper is built):**
- `meals/[id]/route.ts` (PUT) — `UpdateMealSchema` already exists, just wire up (also fixes mass assignment — see 1b)
- `expenses/[id]/route.ts` (PUT) — already has field whitelisting, migrate to schema validation
- `workouts/[id]/route.ts` (PUT) — author update schema
- `workout-templates/[id]/route.ts` (PUT) — author update schema
- `budgets/[id]/route.ts` (PUT) — author update schema
- `goals/[id]/route.ts` (PUT) — author update schema
- `recurring-expenses/[id]/route.ts` (PATCH) — author schema
- `recurring-expenses/[id]/skip/route.ts` (POST) — author schema
- `saved-foods/[id]/route.ts` (PUT) — `UpdateSavedFoodSchema` already imported but unused, just wire up
- `scheduled-workouts/[id]/route.ts` (PUT) — author schema
- `routine-templates/[id]/route.ts` (PUT) — mass assignment risk, author schema
- `routine-journal/[id]/route.ts` (PUT) — author schema
- `routine-challenges/[id]/route.ts` (POST) — author schema
- `cardio-plans/[id]/route.ts` (PATCH) — author schema

**Phase 3 — Workout system (shared exercise validation):**
- `workouts/route.ts` (POST) — `CreateWorkoutSchema` already exists, wire up
- `workouts/generate/route.ts` (POST) — author schema
- `exercise-favorites/route.ts` (POST/DELETE) — author schema
- `personal-records/route.ts` (POST) — author schema

**Phase 4 — Routine system (shared routine types, 7+ routes):**
- `routines/route.ts` (POST) — author schema
- `routine-templates/route.ts` (POST) — author schema
- `routine-steps/route.ts` (POST) — author schema
- `routine-stats/route.ts` (POST) — author schema
- `routine-streaks/route.ts` (POST) — author schema
- `routine-journal/route.ts` (POST) — author schema

**Phase 5 — Other routes:**
- `notifications/subscribe/route.ts` (POST) — author schema (see 1c)
- `notifications/unsubscribe/route.ts` (POST) — author schema
- `settings/email/route.ts` (POST) — author schema
- `scheduled-workouts/route.ts` (POST) — author schema
- `achievements/route.ts` (POST) — author schema
- `streaks/route.ts` (POST) — author schema
- `ai/parse-input/route.ts` (POST) — author schema
- `ai-insights/route.ts` (POST) — author schema

### 1b. Fix mass assignment vulnerability

`meals/[id]/route.ts` PUT: `.update(body)` passes the entire request body to Supabase. An attacker could inject `user_id`, `created_at`, or any column. `UpdateMealSchema` already exists in `schemas.ts` (`CreateMealSchema.partial()`). Wire it up via `withAuthParamsAndValidation` in Phase 2 to whitelist only valid fields.

Also affects `routine-templates/[id]/route.ts` PUT which passes body fields directly to `.update()`.

### 1c. Fix `notifications/subscribe` crash

Currently crashes with TypeError on malformed input because it accesses `subscription.keys.p256dh` without checking if `keys` exists. Author a Zod schema:

```ts
const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})
```

### 1d. Error response format strategy

The current mixed pattern is intentional and reasonable — do NOT change to "always throw."

**Decision: keep the `return` pattern for known 4xx responses, `throw` only for unexpected errors.**

Rationale: 112+ call sites use `return NextResponse.json({error}, {status})` to return 400, 403, 404, 502, 503 with specific status codes. Frontend hooks check `response.status` for graceful degradation (e.g., `use-meals.ts` checks 401 to return `null`). If all routes switched to `throw`, `withAuth` would catch everything and return status 500, losing all semantic status codes.

Error response shape:
- `withAuth` 401: `{ error: 'Unauthorized' }`
- `withAuth` 500: `{ error: <message> }`
- `withAuthAndValidation` 400: `{ error: 'Validation failed', details: [{ path, message }] }`
- Routes returning known errors: `{ error: <human-readable message> }` with appropriate status code

Zod validation `details` field is intentionally returned to help with form error display.

**Fix `withAuth` non-Error handling**: Currently `error instanceof Error` check causes `withAuth` to return generic "Internal server error" for raw Supabase PostgrestError throws. Fix to also handle objects with a `.message` property:

```ts
const message = error instanceof Error
  ? error.message
  : (typeof error === 'object' && error !== null && 'message' in error)
    ? String((error as { message: unknown }).message)
    : 'Internal server error'
```

**Fix Supabase error leakage**: 19 routes do `throw new Error(error.message)` which leaks Supabase table/column/constraint names. Replace with generic messages like `'Failed to save workout'`, `'Failed to update meal'`, etc. Keep the original error in `console.error` for debugging.

### 1e. Fix partial workout creation

`workouts/route.ts`: if exercises fail to insert after the workout record is created, delete the orphaned workout record in a catch block (application-level cleanup). This is simpler than a Supabase RPC transaction and handles the common failure case:

```ts
// After workout insert succeeds
try {
  await supabase.from('workout_exercises').insert(exercisesToInsert)
} catch (exerciseError) {
  console.error('Failed to insert exercises, cleaning up workout:', exerciseError)
  await supabase.from('workouts').delete().eq('id', workoutId)
  throw new Error('Failed to save workout exercises')
}
```

---

## Section 2: Component Layer

### 2a. Add global error boundary + `app/error.tsx`

`layout.tsx` is a Server Component (no `'use client'`). A class-based `ErrorBoundary` cannot render inside it directly.

**Solution: extract providers into a client component.**

Create `app/providers.tsx` as a `'use client'` component:
```tsx
'use client'
import { ErrorBoundary } from '@/components/error-boundary'
// ... import all providers

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary errorTitle="Something went wrong" errorDescription="The app encountered an unexpected error.">
      <ThemeProvider ...>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
```

Then `layout.tsx` renders `<Providers>{children}</Providers>`.

Create `app/error.tsx` as a `'use client'` component (Next.js requirement):
- Shows a clear error state with retry button
- This is a secondary safety net — it catches page rendering errors only
- The provider-level `ErrorBoundary` is the primary defense (catches provider init crashes)
- `error.tsx` cannot catch errors in `layout.tsx` — that's why the provider wrapper is essential
- Note: the error fallback UI will NOT have access to auth/query context (providers are above the boundary), so design it as standalone UI with a simple "Reload" button

### 2b. Fix WorkoutLogger save and state loss

Two issues:

**Issue 1 — Save failure clears state**: `page.tsx` `onComplete` callback calls `await createWorkout(apiData)` without try/catch. On failure, `activeWorkout` and `exerciseLogs` are cleared unconditionally. Fix with try/catch:

```ts
onComplete={async (workoutData) => {
  try {
    const apiData = buildWorkoutApiData(workoutData)
    await createWorkout(apiData)
    setActiveWorkout(undefined)
    setExerciseLogs([])
  } catch (error) {
    toast.error('Failed to save workout — your data is preserved. Please try again.')
    // Keep activeWorkout and exerciseLogs intact for retry
  }
}}
```

**Issue 2 — Tab switch unmounts logger**: WorkoutLogger's rendering condition is `activeWorkout !== undefined && activeView !== 'workouts'`. Navigating to the 'workouts' tab during an active workout unmounts the logger, losing position state (current exercise index, rest timer, editing state). Set data itself is preserved via `exerciseLogs` sync. Fix: keep the WorkoutLogger mounted when switching to the workouts tab (adjust the rendering condition or lift state).

### 2c. Fix NLInputSheet and PushNotificationManager error handling

- `NLInputSheet`: wrap the AI parsing call in try/catch, show user-friendly error toast instead of silent failure
- `PushNotificationManager`: catch permission/subscription failures, degrade gracefully without crashing

### 2d. Fix Web Share Target handler

`page.tsx` lines 296-329: replace the deeply nested `.then().then().then().catch()` chain with async/await + single try/catch. Show user-facing error toast on failure instead of silent console.error at multiple levels.

---

## Section 3: Hook Layer

### 3a. Fix frontend error key mismatch in `use-workouts.ts` and `use-routines.ts`

All API routes return `{ error: "msg" }`. Most hooks correctly read `error.error`. But `use-workouts.ts` (8 mutation functions) and `use-routines.ts` (13 mutation functions) read `error.message`, which is always `undefined` in the JSON response, so they always fall through to hardcoded fallback strings like `'failed to create workout'`.

Fix: change `error.message` to `error.error` in all mutation error handlers across both files.

### 3b. Fix double toast notifications

Two operations have double toasts:

**Delete expense:** `handleDelete` in `use-expense-operations.ts` shows `"Expense deleted"` toast, then the underlying `deleteExpenseMutation` also shows `"Expense deleted"` from its `onSuccess`. User sees two identical toasts.

**Update notes:** `handleUpdateNotes` passes inline `onSuccess` showing `"Notes updated"`, but the underlying `useUpdateExpense` mutation also shows `"Expense updated successfully"`. User sees two different toasts.

**Fix:** Remove the mutation-level `onSuccess` toasts from `useUpdateExpense` and `useDeleteExpenseOptimistic`. Let call sites own their toast messages. Update `handleSubmit` (which currently relies on the mutation-level toast) to show its own toast. `useUpdateExpense` is only consumed by `use-expense-operations.ts`, so this is safe.

### 3c. Replace Supabase error message leakage in routes

19 API routes do `throw new Error(error.message)` which leaks Supabase table names, column names, and constraint details in error responses. Replace with resource-specific generic messages. Keep the original error in `console.error` for debugging:

```ts
// Before:
throw new Error(error.message)

// After:
console.error('Failed to create workout:', error)
throw new Error('Failed to save workout')
```

Affected routes: expenses, workouts, meals, budgets, goals, routines, routine-templates, routine-steps, routine-stats, routine-streaks, routine-journal, scheduled-workouts, categories, weight, water, saved-foods, exercise-favorites, custom-exercises, personal-records.

### 3d. Skip `safeMutation` wrapper

Most mutation hooks already have reasonable `onError` handlers. Fix the specific outliers inline (error key mismatch, Supabase leakage). No shared wrapper needed — revisit if error mapping logic becomes duplicated across 5+ hooks.

---

## Section 4: Cleanup

### 4a. Remove offline queue code and consumers

`lib/hooks/use-offline-queue.ts` is imported by `offline-indicator.tsx` and re-exported from `lib/hooks/index.ts`, but is never connected to any data mutation hook. The e2e test for offline is already skipped. Since offline-first is out of scope, remove everything:

- Delete `lib/hooks/use-offline-queue.ts`
- Delete `components/offline-indicator.tsx` (not imported by any page/layout)
- Remove barrel exports from `lib/hooks/index.ts` (`useOfflineQueue`, `PendingMutation`)
- Delete `__tests__/integration/offline-sync-flow.test.ts`
- Delete `e2e/fixtures/offline.fixture.ts`
- Remove the skipped offline test in `e2e/tests/mobile/mobile-interactions.spec.ts`
- Keep `components/network-status.tsx` (offline banner still useful)
- Keep `components/service-worker-registration.ts` (caching valuable for performance)

---

## Verification

Success criteria for each section:

**Section 1 (API):**
- All existing tests pass
- Sending malformed JSON to each migrated route returns 400 (not 500)
- Sending extra fields to `meals/[id]` PUT is rejected
- No API response contains Supabase table/column/constraint names
- All routes return `{ error: string }` (with optional `details` for validation)

**Section 2 (Components):**
- Manually triggering a provider crash (e.g., corrupting auth state) shows error UI, not white screen
- Force-killing the server during a workout save shows "Failed to save" toast, workout data preserved
- `app/error.tsx` catches page-level render errors

**Section 3 (Hooks):**
- Workout/routine mutation failures show actual server error messages (not hardcoded fallbacks)
- Deleting an expense shows exactly one toast
- Updating expense notes shows exactly one toast

**Section 4 (Cleanup):**
- No remaining imports of `use-offline-queue` in the codebase
- App builds and runs with no errors after removal

---

## Out of Scope

- Offline-first mutation queueing
- Performance optimization / bundle size reduction
- New features or UI changes
- Refactoring `page.tsx` (810 lines) into smaller modules (separate effort)
- Merging `lib/types/` manual interfaces into Zod schema inference (separate effort)
- Moving inline Zod schemas from cardio route files into `lib/api/schemas.ts`
