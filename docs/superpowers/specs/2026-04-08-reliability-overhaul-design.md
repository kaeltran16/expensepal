# Comprehensive Reliability Overhaul

**Date**: 2026-04-08
**Status**: Approved
**Scope**: API validation, error handling, component resilience, hook consistency

## Problem

The app has grown rapidly with inconsistent error handling patterns across layers. Specific issues:

- **Data loss bugs**: Workout saves fail silently, losing user's entire workout data
- **Security vulnerability**: `meals/[id]` PUT passes entire request body to Supabase update (mass assignment)
- **23 API routes** use raw `request.json()` instead of `safeParseJSON()`, returning generic errors on malformed input
- **18 API routes** lack Zod input validation, accepting unvalidated data
- **No global error boundary** — provider crashes show white screen
- **Inconsistent error responses** — three different patterns across API routes
- **Offline queue disconnected** from all mutation hooks — dead code
- **Double toast notifications** on expense note updates
- **`useWorkouts` disabled by default** when no options passed

## Approach

Systematic layer-by-layer: fix each layer completely before moving to the next. Each layer is independently testable.

Offline mode is out of scope — the user does not use the app offline. The unused offline queue code will be removed.

---

## Section 1: API Layer Hardening

### 1a. Migrate all routes to `withAuthAndValidation` + Zod schemas

18 routes use raw `request.json()` with manual field checks. Migrate them to the existing `withAuthAndValidation` pattern (already used by `weight`, `categories`, `cardio-plans`, `profile`).

Each route gets a Zod schema defining its expected input. Example for `workouts/route.ts` POST:

```ts
const CreateWorkoutSchema = z.object({
  template_id: z.string().optional(),
  started_at: z.string(),
  completed_at: z.string(),
  duration_minutes: z.number().min(0),
  notes: z.string().optional(),
  exerciseLogs: z.array(z.object({
    exercise_id: z.string(),
    sets: z.array(z.object({
      reps: z.number(),
      weight: z.number().optional(),
      completed: z.boolean().optional(),
      notes: z.string().optional(),
    })),
  })),
})
```

Routes to migrate (grouped by priority):

**High traffic:**
- `workouts/route.ts` (POST)
- `workouts/[id]/route.ts` (PUT)
- `meals/route.ts` (POST)
- `meals/[id]/route.ts` (PUT)
- `budgets/route.ts` (POST)
- `budgets/[id]/route.ts` (PUT)
- `expenses` — already has field whitelisting, verify completeness

**Health/fitness:**
- `routines/route.ts`
- `routine-templates/route.ts`
- `routine-steps/route.ts`
- `routine-stats/route.ts`
- `routine-streaks/route.ts`
- `routine-journal/route.ts`

**Other:**
- `scheduled-workouts/route.ts`
- `scheduled-workouts/[id]/route.ts`
- `notifications/subscribe/route.ts`
- `settings/email/route.ts`
- `personal-records/route.ts`
- `achievements/route.ts`
- `exercise-favorites/route.ts`
- `custom-exercises/route.ts`
- `saved-foods/[id]/route.ts`
- `recurring-expenses/save-detected/route.ts`
- `ai/parse-input/route.ts`
- `workouts/generate/route.ts`
- `workout-templates/[id]/route.ts`

### 1b. Fix mass assignment vulnerability

`meals/[id]/route.ts` PUT: whitelist update fields (name, meal_date, calories, protein, carbs, fat, foods, notes) instead of passing entire body to Supabase. Follow the same pattern as `expenses/[id]/route.ts` lines 59-67.

### 1c. Fix `notifications/subscribe` crash

Add validation for `subscription.keys.p256dh` — currently crashes with TypeError on malformed input because it accesses `subscription.keys.p256dh` without checking if `keys` exists. Use Zod schema:

```ts
const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})
```

### 1d. Standardize error response format

All routes use `throw` and let `withAuth`/`withAuthAndValidation` catch and respond. Remove the mixed `return NextResponse.json({error})` pattern from routes like `budgets`. Both wrappers return:

```json
{ "error": "Human-readable message" }
```

With appropriate HTTP status codes: 400 (validation), 401 (auth), 404 (not found), 500 (server). No raw Supabase error details leaked to client.

### 1e. Fix partial workout creation

`workouts/route.ts`: if exercises fail to insert after the workout record is created, include a warning in the response. The client can show "Workout saved, but some exercises may be missing." Investigate whether a Supabase RPC/transaction is feasible for atomicity.

---

## Section 2: Component Layer

### 2a. Add global error boundary + `app/error.tsx`

- Wrap the provider tree in `layout.tsx` lines 166-188 with the existing `<ErrorBoundary>` component
- Create `app/error.tsx` as a Next.js route-level error boundary (required by Next.js App Router)
- Both show a clear error state with retry button
- The layout-level boundary catches provider crashes (localStorage quota, corrupted auth state)
- The route-level boundary catches page rendering errors

### 2b. Fix WorkoutLogger save data loss

`page.tsx` lines 722-737: the `onComplete` callback calls `await createWorkout(apiData)` without try/catch. On failure, `activeWorkout` and `exerciseLogs` are cleared unconditionally, losing the user's workout data.

Fix:
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

### 2c. Fix NLInputSheet and PushNotificationManager error handling

- `NLInputSheet`: wrap the AI parsing call in try/catch, show user-friendly error toast instead of silent failure
- `PushNotificationManager`: catch permission/subscription failures, degrade gracefully without crashing

### 2d. Fix Web Share Target handler

`page.tsx` lines 296-329: replace the deeply nested `.then().then().then().catch()` chain with async/await + single try/catch. Show user-facing error toast on failure instead of silent console.error at multiple levels.

---

## Section 3: Hook Layer

### 3a. Fix `useWorkouts` enabled default

`useWorkouts` passes `options?.enabled` which is `undefined` when no options object is provided. `undefined` is falsy, so the query is disabled. Fix to default to `true`:

```ts
enabled: options?.enabled ?? true
```

### 3b. Fix double toast notifications

`use-expense-operations.ts`: `handleUpdateNotes` shows "Notes updated" toast in its own `onSuccess`, but the underlying mutation hook also fires "Expense updated successfully" from its `onSuccess`. Remove the local toast — the mutation-level handler is the single source of truth.

### 3c. Standardize mutation error handling

All mutation hooks should:
- Show a single user-facing error toast on failure
- Never expose Supabase error details (table names, column names, constraints)
- Map error types to friendly messages: "Network error — check your connection", "Failed to save workout — please try again", etc.

### 3d. Skip `safeMutation` wrapper

After review, most mutation hooks already have reasonable `onError` handlers. A shared wrapper would be premature abstraction — just fix the specific outliers (workout save, meal update, notification subscribe) inline. Revisit if error mapping logic becomes duplicated across 5+ hooks in the future.

---

## Section 4: Cleanup

### 4a. Remove unused offline queue

`lib/hooks/use-offline-queue.ts` is never used by any mutation hook. Since offline mode is not a priority:

- Delete `lib/hooks/use-offline-queue.ts`
- Remove any imports/references to it
- Keep `components/network-status.tsx` (offline banner still useful)
- Keep `components/service-worker-registration.ts` (caching valuable for performance)

### 4b. Ensure consistent API error shape across wrappers

Both `withAuth` and `withAuthAndValidation` should return the same JSON error shape with appropriate status codes. Verify `withAuth` handles non-Error throws (raw Supabase errors) gracefully — currently `error instanceof Error` check causes it to return generic "Internal server error" for non-Error throws.

---

## Out of Scope

- Offline-first mutation queueing
- Performance optimization / bundle size reduction
- New features or UI changes
- Refactoring `page.tsx` (810 lines) into smaller modules (separate effort)
