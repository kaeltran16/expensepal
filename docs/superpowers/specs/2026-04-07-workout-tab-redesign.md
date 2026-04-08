# Workout Tab Redesign -- Dashboard Style

## Summary

Redesign the workout tab from a flat stack of equally-weighted ios-cards into a fitness dashboard with clear visual hierarchy, contextual AI integration, and new features (week calendar, muscle map, progress tracking). All changes use the existing design system (ios-card, Tailwind tokens, Framer Motion, dark mode).

## Problems Being Solved

1. Everything has equal visual weight -- no clear hierarchy
2. AI Generator button is orphaned between sections
3. Templates (the main action) are buried under 4 sections of scrolling
4. Streak badge is oversized for its informational value
5. Stats are shallow (only 3 basic metrics)
6. Card monotony -- every section looks the same
7. Template cards are text-heavy with no visual identity
8. No personality or energy -- feels like a utility, not a fitness app
9. No calendar/schedule visible on the main tab
10. No muscle group visualization
11. No at-a-glance progress indicators
12. No quick/empty workout option

## New Layout (top to bottom)

### 1. Today Header

A single prominent card that replaces Hero, Streak Badge, and AI Generator button.

**Three states based on today's workout status:**

**State A -- Workout Scheduled:**
- Gradient background using theme tokens (primary to accent)
- "Today" label, template name, exercise count, duration
- Progress ring (top-right) showing weekly goal (e.g., 2/3 workouts)
- Two action buttons: "Start Workout" (primary), "+ Empty" (secondary)
- Inline streak: compact single line with flame icon, current streak, best streak

**State B -- No Workout Scheduled:**
- Different gradient tone (creative/AI mode feel)
- "What are we training?" headline
- Quick-tap muscle group tags (Upper Body, Lower Body, Full Body, Core) that pre-fill the AI generator sheet
- Two action buttons: "Generate Workout" with sparkle icon (primary), "+ Empty" (secondary)
- Same progress ring and inline streak as State A

**State C -- Today Completed:**
- Success-toned gradient
- Celebratory message with completion details
- Progress ring shows completed state
- Inline streak updated

**"+ Empty" button:** Opens the workout logger with no pre-loaded template. User picks exercises as they go. This is a new flow -- the workout logger needs to support starting without a template.

**Progress ring:** Shows `completed_this_week / weekly_goal`. Weekly goal comes from the user's workout profile (`training_frequency` field already exists in `workout_profiles` table).

### 2. Week Strip

A compact 7-day horizontal calendar showing the current week.

- Each day shows: abbreviated day name, date number, status indicator
- Day states:
  - **Completed:** Green background, checkmark
  - **Today (scheduled):** Primary color, highlighted/elevated, template name abbreviation
  - **Upcoming (scheduled):** Light tinted background, template name abbreviation
  - **Rest day / Unscheduled:** Muted/gray background, "Rest" label. Any day without a scheduled workout is treated as a rest day.
- "Full Calendar" link (top-right) opens the existing WorkoutCalendar sheet
- Data source: `useThisWeekScheduledWorkouts()` hook (already exists)

### 3. Quick Stats Bar

A compact 4-column row replacing the current 3-column WorkoutStats card.

Metrics:
- **Workouts:** Count of completed workouts this week (existing)
- **Time:** Total workout time this week (existing)
- **Volume:** Total volume in kg/lbs this week (new -- sum of sets x reps x weight from workout_exercises)
- **Trend:** Week-over-week percentage change in volume (new -- compare current week volume to previous week)

Styling: Small individual cards in a row, no section header. Number prominent, label small below. Each metric gets a semantic color.

### 4. Templates Section

Redesigned template cards with visual identity. Section header includes "My Templates" title with "AI Generate" and "+ New" inline links.

**Template card redesign:**
- Gradient icon/avatar on the left (color derived from template difficulty: green for beginner, blue for intermediate, red/purple for advanced)
- Template name (primary text)
- Muscle groups as subtitle (derived from exercises in the template)
- Metadata row: exercise count, duration, difficulty
- Chevron right indicator
- Swipe-to-delete preserved

The "AI Generate" link in the header is a secondary access point -- opens the same WorkoutGeneratorSheet. Primary AI access is through the Today Header (State B).

Max visible templates: 5 (unchanged), with "View all" expansion.

### 5. Muscle Map + Recent PRs (side-by-side)

Two compact cards side by side.

**Muscle Map (left):**
- Title: "Muscle Map"
- Tag cloud of major muscle groups: Chest, Back, Shoulders, Arms, Legs, Core
- Tags are colored (primary/success) when that group was trained this week, muted when not
- Summary line: "X/6 groups hit this week"
- Data source: Cross-reference this week's completed workout exercises with the `muscle_groups` field on the `exercises` table
- Muscle group mapping: The exercises table stores granular groups (e.g., "quadriceps", "hamstrings", "glutes"). Map these to 6 display categories: Chest (chest, pectorals), Back (back, lats, traps, rhomboids), Shoulders (shoulders, deltoids), Arms (biceps, triceps, forearms), Legs (quadriceps, hamstrings, glutes, calves), Core (abs, obliques, core, lower back). A group is "hit" if any sub-group was trained.

**Recent PRs (right):**
- Title: "Recent PRs"
- List of 3 most recent personal records with exercise name and value
- "View all" link opening analytics/PR sheet
- Data source: `usePersonalRecords()` (already exists)

### 6. Recent Activity

Compact list replacing the current WorkoutRecentActivity cards.

- No standalone ios-cards per workout -- single card containing a list
- Each row: small status icon, workout name, relative date, duration, total volume
- Max 3 visible, with "View all" link
- Data source: `recentWorkouts` prop (unchanged)

## Component Changes

### New Components
- `WorkoutTodayHeader.tsx` -- replaces WorkoutHero, absorbs streak (inline) and AI entry point
- `WorkoutWeekStrip.tsx` -- 7-day calendar strip
- `WorkoutQuickStats.tsx` -- 4-stat compact row
- `WorkoutMuscleMap.tsx` -- muscle group tag cloud
- `WorkoutRecentPRs.tsx` -- compact PR list

### Modified Components
- `WorkoutTemplatesList.tsx` -- redesigned card layout with gradient icons and muscle group subtitles
- `workouts-view.tsx` -- new layout composition, remove standalone AI button and streak badge section
- `workout-logger.tsx` -- support starting with no template (empty workout flow)

### Removed from Main View
- Standalone `WorkoutStreakBadge` usage (streak moves inline into header)
- Standalone AI Generator `Button` (moves into header State B + templates header link)
- `WorkoutStats` replaced by `WorkoutQuickStats`
- `WorkoutHero` replaced by `WorkoutTodayHeader`

Note: The existing components (`WorkoutStreakBadge`, `WorkoutStats`, `WorkoutHero`) should be kept in the codebase if used elsewhere, but removed from `workouts-view.tsx`.

## Data Requirements

### New Queries/Computations
- **Weekly volume:** Sum `total_volume` from `workout_exercises` for workouts completed this week. Can be computed client-side from existing workout data or added as a dedicated query.
- **Previous week volume:** Same computation for the prior week, for the trend calculation.
- **Muscle groups hit this week:** Cross-reference completed workout exercises with exercise muscle_groups. Client-side join using cached exercises data.
- **Weekly goal:** Read `training_frequency` from `workout_profiles`. If no profile exists, default to 3.

### Existing Data (no changes needed)
- Today's scheduled workout: `useTodayScheduledWorkout()`
- This week's schedule: `useThisWeekScheduledWorkouts()`
- Templates: `useWorkoutTemplates()`
- Recent workouts: `useWorkouts()`
- Personal records: `usePersonalRecords()`
- Streak: existing streak computation in `WorkoutStreakBadge`

## Empty Workout Flow

New capability: start a workout without a template.

- Triggered by "+ Empty" button in the Today Header
- Opens workout logger with empty exercise list
- User adds exercises on the fly via the exercise picker
- On completion, saves as a regular workout (no template_id)
- Template name in summary shows "Quick Workout" or similar

This requires the workout logger to handle `null` template gracefully -- currently it expects a `WorkoutTemplate` to be passed in.

## Design Constraints

- All styling uses existing Tailwind tokens and theme variables
- Dark mode must work (use `bg-primary/10`, `text-foreground`, etc. -- no hardcoded colors)
- iOS HIG compliance: 44px min touch targets, safe area padding, haptic feedback
- Framer Motion animations using existing spring configs (`springs.ios`)
- Staggered entry animations for lists
- Gradient backgrounds for the Today Header use theme-aware tokens (not raw hex values)

## Animations & Motion

All animations use the existing Framer Motion setup (`motion/react`) and the app's spring configs.

### Page Entry
- Today Header slides down and fades in first (delay 0)
- Week Strip, Quick Stats, Templates, Muscle Map + PRs, Recent Activity stagger in sequence (50-80ms delay between each)
- Uses existing `variants.slideUp` pattern with `staggerChildren`

### Today Header
- Progress ring animates on mount: stroke-dashoffset transitions from full to current value (spring, ~0.8s)
- State transitions (A/B/C) crossfade with `AnimatePresence` -- gradient, text, and buttons transition together
- Muscle group tags in State B scale in with stagger (spring, 30ms delay each)
- Streak number counts up from 0 on first mount (number ticker effect)

### Week Strip
- Days stagger in left-to-right (30ms delay)
- Today's cell has a subtle pulse/glow animation on mount (one-time, not looping)
- Completed day checkmarks scale-spring in

### Quick Stats
- Numbers count up from 0 on mount (odometer-style, ~0.6s)
- Trend percentage ("+8%") has a slight upward slide if positive, downward if negative

### Templates
- Cards stagger in (existing pattern)
- Gradient icon on each card has a subtle shimmer on first render (one-time)
- Swipe-to-delete: existing drag animation preserved

### Muscle Map
- Tags that are "hit" this week pulse once on mount (scale 1 -> 1.05 -> 1, spring)
- Unhit tags are static

### Recent PRs
- Star icons rotate in (0 -> 360deg, spring) on mount
- Stagger between PR rows

### Interactions
- All tappable elements use existing `variants.scale` (press down to 0.97, spring back)
- Haptic feedback on: Start Workout, Generate Workout, + Empty, muscle group tag tap, template tap
- Sheet openings use existing bottom-sheet spring animation

### Performance
- All entry animations use `will-change: transform, opacity` and clean up after animation completes
- Stagger delays are short (30-80ms) to feel snappy, not sluggish
- No looping animations -- everything fires once on mount or on state change

## Out of Scope

- Workout profile setup/onboarding (weekly goal uses existing `training_frequency` or defaults to 3)
- Social/sharing features
- Progress photos or body measurements
- Superset/circuit workout support
- Real-time Supabase subscriptions
- Changes to the workout logger UI beyond empty workout support
- Changes to other tabs
