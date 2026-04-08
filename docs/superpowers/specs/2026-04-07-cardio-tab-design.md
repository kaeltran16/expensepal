# Cardio Tab Design Spec

## Overview

Add a "Cardio" sub-tab within the existing Workouts view, accessible via a segmented control (Strength | Cardio). The cardio tab starts with treadmill support and is architected to support additional cardio exercise types (cycling, rowing) in the future.

Core features:
- AI-generated progressive treadmill training plans
- Guided session logging with segment-by-segment tracking
- Cardio-specific stats and session history

## Architecture: Separate Domain

The cardio feature gets its own database tables, API routes, hooks, and components. It connects to the strength side only at the view level (shared `Tabs` component in `WorkoutsView`). No changes to existing strength workout tables or components.

Rationale: Cardio has fundamentally different data (segments with duration/distance/speed/incline vs sets with reps/weight). A separate domain avoids union types, conditionals in shared components, and risk of breaking the strength side.

## Data Model

### `cardio_plans`

AI-generated multi-week training programs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users |
| `exercise_type` | text | `'treadmill'`, future: `'cycling'`, `'rowing'` |
| `name` | text | e.g., "Beginner 5K Program" |
| `goal` | text | User's original goal text |
| `fitness_level` | text | `'beginner'`, `'intermediate'`, `'advanced'` |
| `total_weeks` | integer | AI-determined |
| `sessions_per_week` | integer | User-selected (2-5) |
| `plan_data` | jsonb | Array of weeks -> sessions -> segments |
| `status` | text | `'active'`, `'paused'`, `'completed'` |
| `current_week` | integer | 1-indexed progress |
| `current_session` | integer | 1-indexed within current week |
| `created_at` | timestamptz | |

Constraint: Only one plan with `status = 'active'` per user at a time.

`plan_data` JSON structure:
```json
{
  "weeks": [
    {
      "week_number": 1,
      "sessions": [
        {
          "session_number": 1,
          "segments": [
            {
              "type": "warm_up",
              "duration_seconds": 300,
              "speed": 5.0,
              "settings": { "incline": 0 }
            },
            {
              "type": "main",
              "duration_seconds": 1200,
              "speed": 7.5,
              "settings": { "incline": 2 }
            },
            {
              "type": "cool_down",
              "duration_seconds": 300,
              "speed": 4.0,
              "settings": { "incline": 0 }
            }
          ]
        }
      ]
    }
  ]
}
```

### `cardio_sessions`

Completed cardio workouts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users |
| `plan_id` | uuid | Nullable FK to cardio_plans. Null = free session |
| `exercise_type` | text | `'treadmill'` etc. |
| `session_date` | date | |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | |
| `duration_minutes` | numeric | Total session time |
| `total_distance` | numeric | Nullable, in km |
| `avg_speed` | numeric | Nullable, in km/h |
| `plan_week` | integer | Nullable. Which plan week this fulfilled |
| `plan_session` | integer | Nullable. Which session within the week |
| `notes` | text | Nullable |

### `cardio_segments`

Individual segments within a session (warm-up, main, intervals, cool-down).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `session_id` | uuid | FK to cardio_sessions |
| `segment_order` | integer | Display/execution order |
| `segment_type` | text | `'warm_up'`, `'main'`, `'cool_down'`, `'interval'` |
| `duration_seconds` | integer | Actual duration |
| `distance` | numeric | Nullable, in km |
| `speed` | numeric | Nullable, in km/h |
| `settings` | jsonb | Exercise-specific: `{ incline: 5 }` for treadmill, `{ resistance: 8 }` for cycling |
| `is_planned` | boolean | True if values match the plan prescription |
| `completed` | boolean | |

## UI Structure

### Segmented Control

Uses the existing `Tabs`/`TabsList`/`TabsTrigger` component from `components/ui/tabs.tsx` with a 2-column grid layout, matching the RoutinesView pattern. Placed at the top of `WorkoutsView`.

- "Strength" tab renders the existing workout dashboard (unchanged)
- "Cardio" tab renders the new `CardioView` component

### Cardio Dashboard Components

All new components live under `components/workouts/`.

**CardioPlanHero** -- Top card on the dashboard.
- If active plan exists: plan name, progress ring (% complete), current week/session indicator, "Start Today's Run" button
- If no active plan: "Generate a Plan" CTA button

**CardioSessionPreview** -- Today's prescribed workout.
- Visual segment layout: warm-up | main | cool-down blocks side by side
- Each block shows: segment type label, duration, speed, and exercise-specific settings (e.g., incline)
- Main segment visually emphasized (wider, primary color border)

**CardioQuickStats** -- 3-stat grid.
- Weekly distance (km), average pace (min/km), total time (minutes)
- Same grid pattern as `WorkoutQuickStats` on the strength side

**CardioRecentSessions** -- List of recent completed sessions.
- Shows: plan context (week/session), date, distance, duration
- Tapping opens a detail view (future scope)

### No-Plan State

When the user has no active plan, the dashboard shows:
- `CardioPlanHero` with "Generate a Plan" CTA
- `CardioQuickStats` (shows zeros or data from past sessions)
- `CardioRecentSessions` (shows past sessions if any)
- `CardioSessionPreview` is hidden (nothing to preview)

## AI Plan Generation Flow

### User Input

A dialog/sheet (`CardioPlanDialog`) collects:
1. **Goal** -- free text (e.g., "run 5km in 30 min", "build endurance for 10K")
2. **Fitness level** -- beginner / intermediate / advanced
3. **Sessions per week** -- 2-5 (numeric stepper or button group)

### Generation

- `POST /api/ai/generate-cardio-plan` sends the inputs to the AI with a system prompt that defines the plan JSON structure and treadmill training principles
- AI returns a structured plan with appropriate duration (weeks) based on the goal and fitness level
- Response includes a brief summary for the preview

### Preview & Confirmation

`CardioPlanPreview` shows:
- Plan name (AI-generated)
- Duration (e.g., "8 weeks")
- Sessions per week
- Week-by-week progression summary (brief, e.g., "Week 1-2: Base building, Week 3-5: Speed work, Week 6-8: Race prep")
- User confirms ("Start Plan") or regenerates ("Try Again")

On confirmation, plan is saved to `cardio_plans` with `status: 'active'`. Any existing active plan is set to `'paused'`.

## Guided Session Flow

When the user taps "Start Today's Run":

1. **Session screen opens** (`CardioSessionLogger`) -- full-screen, same pattern as the strength `WorkoutLogger`
2. Shows the first segment with prescribed values (type, duration, speed, settings)
3. User taps "Start" -- timer begins counting for the current segment
4. When segment timer completes, the next segment is highlighted with its targets
5. For each segment, prescribed values are pre-filled. User can tap any value to edit if they deviated
6. After the last segment, user taps "Finish"
7. **Summary screen** (`CardioSessionSummary`) shows:
   - Total duration, total distance (sum of segments), average speed
   - Per-segment breakdown: planned vs actual
   - Plan progress update (e.g., "Week 3, Session 2 complete -- 1 session left this week")
8. Session and segments are saved. Plan's `current_session` (and `current_week` if applicable) is incremented
9. When the final session of the final week is completed, plan `status` is set to `'completed'`. The `CardioPlanHero` shows a completion state and prompts the user to generate a new plan

## New Components

| Component | Purpose |
|---|---|
| `CardioView` | Main cardio dashboard layout |
| `CardioPlanHero` | Active plan card with progress, or "Generate a Plan" CTA |
| `CardioSessionPreview` | Today's segments visualized |
| `CardioQuickStats` | Weekly distance, avg pace, total time |
| `CardioRecentSessions` | Recent completed sessions list |
| `CardioPlanDialog` | Plan generation input form |
| `CardioPlanPreview` | AI plan preview before confirmation |
| `CardioSessionLogger` | Guided session screen with timer and segment tracking |
| `CardioSessionSummary` | Post-session results and plan comparison |

## New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/ai/generate-cardio-plan` | POST | AI generates structured plan JSON |
| `/api/cardio-plans` | GET | List user's plans |
| `/api/cardio-plans` | POST | Save a confirmed plan |
| `/api/cardio-plans/[id]` | PATCH | Update plan status/progress |
| `/api/cardio-sessions` | GET | List sessions (with date range filter) |
| `/api/cardio-sessions` | POST | Save a completed session with segments |

## New Hooks

- `useCardioPlans` -- fetch active/all plans, create plan, update plan status/progress
- `useCardioSessions` -- fetch sessions, create session, compute weekly stats (distance, pace, time)

## Database Migration

One migration file adding the three new tables (`cardio_plans`, `cardio_sessions`, `cardio_segments`) with appropriate foreign keys, indexes, and RLS policies matching the existing pattern.

## Changes to Existing Code

- `WorkoutsView` (`components/views/workouts-view.tsx`) -- wrap content in `Tabs` component, add `TabsTrigger` for "Strength" and "Cardio", render `CardioView` under the Cardio tab
- No other existing files are modified

## Future Extensibility

Adding a new cardio exercise type (e.g., cycling) requires:
1. New `exercise_type` value in `cardio_plans` and `cardio_sessions`
2. New `settings` keys for the type (e.g., `{ resistance, gear }` for cycling)
3. New UI components for the exercise-specific session logger
4. Updated AI prompt for cycling plan generation

No schema changes, no new tables.
