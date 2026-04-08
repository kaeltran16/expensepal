# Animation Next-Level Upgrade

## Overview

Upgrade the app's animation system from polished-but-basic to fluid, orchestrated, and alive. Builds on the existing iOS-tuned motion system (`motion-system.ts`) using an A+B hybrid approach: Fluid Continuity as the foundation (number rolling, skeleton handoffs, smooth delete) enhanced with Orchestrated Depth for key views (chart cascades, value change pulses, per-view stagger choreography).

**Scope:** 5 areas -- navigation transition fix, list animations overhaul, data visualization animations, state transition animations, micro-interactions.

**Non-goals:** Haptic feedback (doesn't work on iOS PWA), shared element transitions (too fragile for this architecture), gesture-driven physics as a primary paradigm.

---

## 1. Navigation Transition Fix

**Problem:** Current tab navigation uses horizontal slide (60px) + blur filter + cinematic spring (damping: 20, stiffness: 200, mass: 1.2). This feels like a layout shift -- too slow and uses spatial metaphor inappropriate for tab switching.

**Solution:**
- Replace horizontal slide with vertical fade-up: `y: 14 -> 0` with `springs.ios` (damping: 26, stiffness: 300)
- Remove blur filter entirely (expensive and unnecessary)
- Remove directional logic (`getDirection`, `VIEW_ORDER` map) -- tab switches are context switches, not spatial navigation
- Exit animation: simple fast fade (opacity -> 0, 0.1s duration)
- Keep `AnimatePresence mode="wait"` and `initial={false}`
- Keep reduced motion fallback (fade only)

**Files affected:** `components/view-transition.tsx`

---

## 2. List Animations Overhaul

### 2a. Stagger Timing

**Problem:** Current stagger is 10ms/item capped at 10 items (100ms total cascade). Barely perceptible.

**Solution:**
- Increase `STAGGER_DELAY` from 0.01 to 0.04 (40ms per item)
- Increase `STAGGER_MAX_ITEMS` from 10 to 12
- Total cascade: 480ms max, visible wave without feeling sluggish
- Note: this is a global change affecting all lists using `getStaggerDelay()`. The choreography system's `staggerChildren: 0.08` (used in `staggerContainer` variant) is separate and unchanged. Lists that use both (stagger container + individual delays) should be tested to ensure the compound delay isn't excessive.

**Files affected:** `lib/motion-system.ts`

### 2b. Consistent Direction

**Problem:** Some lists use `slideUp` (y: 16), others use `slideLeft` (x: -20). No clear reason for the difference.

**Solution:**
- Standardize all list item entrances to `slideUp` (y: 16 -> 0) with `springs.ios`
- Fix goals list (`components/goals/savings-goal-card.tsx`) -- currently `x: -20`
- Fix budget categories (`components/budget-tracker.tsx`) -- currently `x: -20`

**Files affected:** `components/goals/savings-goal-card.tsx`, `components/budget-tracker.tsx`

### 2c. Animated Delete with Height Collapse

**Problem:** When a swipeable card is dismissed, items below jump up instantly. No smooth reflow.

**Solution:**
- After swipe dismissal, animate the item: opacity -> 0 + translateX (direction of swipe)
- Then spring-animate height, padding, and margin to 0 using `springs.ios`
- Items below flow up smoothly with the height animation
- Sequence: swipe out (0.2s) -> height collapse (springs.ios, ~0.3s)

**Files affected:** `components/ui/swipeable-card.tsx`

### 2d. Skeleton-to-Content Handoff

**Problem:** Hard cut from skeleton to real content.

**Solution:**
- Skeleton fades out (opacity -> 0, 0.15s)
- Real items stagger in immediately after with standard `slideUp` stagger
- Skeletons and content share same vertical positions to prevent layout jump
- Not a true shape morph -- coordinated crossfade

**Files affected:** `components/views/expenses-view.tsx`, `components/views/recurring-view.tsx`, `components/budget-tracker.tsx`, `components/savings-goals.tsx`

### 2e. Meals List Gap

**Problem:** Meals list (`components/meal-list.tsx`) has zero entrance animation. Only list without one.

**Solution:**
- Add `slideUp` stagger entrance matching all other lists
- Wrap items in `motion.div` with `variants.slideUp`, `springs.ios`, and `getStaggerDelay(index)`

**Files affected:** `components/meal-list.tsx`

### 2f. Virtualized List Fade-In

**Problem:** Lists over 50 items (TanStack Virtual) have no animation at all.

**Solution:**
- Add simple fade-in (opacity: 0 -> 1, 0.15s) on each virtual row as it enters viewport
- No stagger (not practical with virtualization)
- Use CSS transition on the virtual row wrapper

**Files affected:** `components/views/expenses-view.tsx` (virtualized path)

---

## 3. Data Visualization Animations

### 3a. Progress Bar Springs

**Problem:** Progress bars fill linearly or snap to target.

**Solution:**
- Replace linear fill with `springs.ios` physics
- Natural overshoot ~3-5% then settle
- Trigger on viewport entry via intersection observer (not on mount)
- Apply to budget meters and goal progress bars

**Files affected:** `components/budget-tracker.tsx`, `components/goals/savings-goal-card.tsx`, any progress bar components

### 3b. Animated Number Counters

**Problem:** `AnimatedCounter` exists but only animates 0 -> target on initial mount. It does NOT track previous values -- when `value` changes, it re-animates from 0 instead of from the old value. Most monetary displays outside the counter snap between values.

**Solution:**
- Refactor `AnimatedCounter` to support value transitions:
  - Add `useRef` to track previous value
  - On initial mount: animate 0 -> target (existing behavior)
  - On value change: animate previousValue -> newValue (new behavior)
  - Duration: 400ms with easeOutCubic (existing easing)
  - Keep existing intersection observer trigger and cleanup
- Extend usage to: budget remaining, goal progress amounts, expense totals in date headers

**Files affected:** `components/animated-counter.tsx` (refactor for value tracking), `components/budget-tracker.tsx`, `components/goals/savings-goal-card.tsx`, `components/views/expenses-view.tsx` (date header totals)

### 3c. Chart Bar Cascade

**Problem:** Chart bars appear statically or all at once. `spending-mini-chart.tsx` already has staggered bar growth with `springs.ios` but `analytics-charts.tsx` (Recharts) does not.

**Solution:**
- **`analytics-charts.tsx` (Recharts):** Use Recharts' native animation props. Set `isAnimationActive={true}`, `animationDuration={500}`, `animationEasing="ease-out"`. Stagger bars using `animationBegin={index * 60}` on individual `<Cell>` elements. Apply same approach to PieChart (`animationBegin` on `<Pie>`).
- **`spending-mini-chart.tsx`:** Already animates with `springs.ios` and 40ms stagger. No changes needed -- this is the target pattern for custom charts.
- Trigger Recharts animation on viewport entry by conditionally rendering the chart when intersection observer fires.

**Files affected:** `components/analytics-charts.tsx`

### 3d. Circular Progress Animation

**Problem:** `CircularProgress` component (`components/circular-progress.tsx`) exists and uses Framer Motion but the stroke animation could be enhanced. Goals currently use a linear progress bar, not a ring.

**Solution:**
- Animate `stroke-dashoffset` with `springs.ios` on viewport entry (intersection observer trigger)
- Ring draws itself as the number counter simultaneously rolls to the percentage
- Apply to existing `CircularProgress` and `MiniCircularProgress` variants

**Files affected:** `components/circular-progress.tsx`

### 3e. Value Change Pulse

**Problem:** When displayed amounts change, there's no visual signal.

**Solution:**
- On value change, briefly scale the number to 1.04 then back to 1
- Use `springs.touch` (damping: 22, stiffness: 400) for quick settle
- Subtle but signals "this just updated"

**Files affected:** `components/animated-counter.tsx` (add pulse as opt-in prop), `components/budget-tracker.tsx` (budget remaining), `components/goals/savings-goal-card.tsx` (goal progress), `components/views/expenses-view.tsx` (date header totals)

---

## 4. State Transition Animations

### 4a. Loading -> Content Handoff

**Problem:** Hard cut from loading skeletons to content.

**Solution:**
- Skeleton shimmer plays while loading
- Skeleton fades out (0.15s)
- Content enters with standard stagger
- Skeletons and content share same vertical positions -- no layout jump

(Same as 2d -- single implementation used across all views)

### 4b. Empty-to-Content Transition

**Problem:** Empty states already animate on entrance (motion/react with bounce/pulse variants in `components/ui/empty-state.tsx`), but when the first item is added, the empty state disappears and the item appears without a coordinated transition.

**Solution:**
- Wrap empty state and list content in `AnimatePresence mode="wait"` so the empty state exits before the first item enters
- Empty state exits with scale-down (0.94) + fade (0.1s)
- First item enters with `slideUp` using `springs.cinematic` (exaggerated entrance for the first-ever item)
- Subsequent items use standard `springs.ios`

**Files affected:** `components/views/expenses-view.tsx`, `components/savings-goals.tsx`, and other views that conditionally render `EmptyState`

### 4c. Success Feedback

**Problem:** After adding an expense or completing an action, the new item just appears in the list.

**Solution:**
- New item enters with exaggerated spring (`springs.cinematic`) instead of standard `springs.ios`
- Subtle green tint flash on the card background, fading over 0.3s
- Inline and contextual -- not a toast notification

**Files affected:** Expense creation flow, any "add item" flows

### 4d. Error/Validation States

**Problem:** Error messages appear statically.

**Solution:**
- Input field error: horizontal shake (3px, 3 oscillations, 0.3s) via CSS keyframe
- Error message enters with `slideDown` (y: -8 -> 0 + fade)
- On resolution: error message exits with fade (0.1s)

**Files affected:** Form components with validation

### 4e. Sub-Tab Content Swap

**Problem:** Recurring view already uses a local `AnimatePresence mode="wait"` with `variants.fade` for its active/detected tab switch (not the main ViewTransition). Other views with internal tabs (workouts, analytics-insights, routines) use Radix `<Tabs>` with no animation on content swap.

**Solution:**
- Recurring view: keep as-is, its crossfade is already appropriate
- Radix Tabs content swap: wrap `<TabsContent>` children in `AnimatePresence` with a simple fade (opacity 0 -> 1, 0.15s) keyed on the active tab value. Apply in `components/ui/tabs.tsx` so all Radix tab usages get the animation automatically.

**Files affected:** `components/ui/tabs.tsx`

---

## 5. Micro-Interactions

### 5a. Button Press Feedback

**Problem:** Inconsistent press feedback. `.ios-press` CSS class is used in ~13 instances across 9 files. The `usePressScale` hook exists in `hooks/use-motion.ts` but is never imported or used anywhere.

**Solution:**
- Standardize on the `.ios-press` CSS class since it's already the de facto standard
- Enhance the CSS class: add opacity dim to 0.85 during press alongside the existing scale (0.97)
- Remove the unused `usePressScale` hook from `hooks/use-motion.ts` (dead code)
- Audit buttons/interactive elements that have neither `.ios-press` nor any press feedback and add the class

**Files affected:** `app/globals.css` (enhance `.ios-press`), `hooks/use-motion.ts` (remove dead code), various components missing press feedback

### 5b. Input Focus Animations

**Problem:** Input fields have no focus animation.

**Solution:**
- On focus: animate border color (0.15s ease) + subtle container scale-up (1.005)
- On blur: reverse
- CSS transitions only -- tier 1 micro, no spring needed

**Files affected:** Input/form components, potentially global CSS

### 5c. Toggle Switch Animations

**Problem:** Toggle switches snap between states.

**Solution:**
- Thumb slides with `springs.touch` (damping: 22, stiffness: 400)
- Track color crossfades with 0.15s CSS transition
- Thumb slightly overshoots destination then snaps back (natural spring behavior)

**Files affected:** Toggle/switch components

### 5d. Nav Icon Transitions

**Problem:** Bottom nav already has CSS scale transitions (0.94 inactive -> 1 active with `transition-transform duration-200`). The transition works but uses linear CSS timing rather than spring physics.

**Solution:**
- Replace CSS `transition-transform` with `motion.div` wrapper using `springs.touch` (damping: 22, stiffness: 400) for the scale animation
- Slight overshoot on activation creates a more tactile "pop" feel vs the linear CSS ease
- Keep the existing color transition as CSS (`transition-colors duration-200`)

**Files affected:** `components/bottom-navigation.tsx`

---

## Technical Approach

### Motion System Changes

- Update `STAGGER_DELAY` (0.01 -> 0.04) and `STAGGER_MAX_ITEMS` (10 -> 12) in `motion-system.ts`
- Enhance `.ios-press` CSS class in `globals.css` to include opacity dim
- Remove unused `usePressScale` hook from `use-motion.ts`
- Refactor `AnimatedCounter` to track previous values for old -> new transitions
- No new dependencies needed -- everything uses existing `motion/react`, `react-intersection-observer`, and Recharts native animation

### Performance Considerations

- Remove blur filter from view transitions (GPU-expensive)
- Use CSS transitions for tier 1 micro-interactions (input focus, toggle tracks)
- Spring physics for tier 2 macro animations (list entrances, progress bars, height collapses)
- Intersection observer triggers prevent off-screen animation waste
- Virtual list items use CSS transitions only (no spring overhead per row)

### Accessibility

- All new animations respect existing `useReducedMotion()` hook
- Reduced motion fallback: fade only for all new animations
- Shake animation (error) degrades to border color flash under reduced motion
