# Animation Next-Level Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the animation system across 5 areas -- navigation transitions, list animations, data viz, state transitions, and micro-interactions -- to feel fluid, orchestrated, and alive.

**Architecture:** Builds on existing `motion-system.ts` with iOS-tuned springs and `motion/react`. Changes span from core motion constants through individual components. No new dependencies.

**Tech Stack:** Next.js 14, React 18, `motion/react` (Framer Motion successor), `react-intersection-observer`, Recharts, Radix UI, Tailwind CSS

---

## File Structure

**Core system (modify):**
- `lib/motion-system.ts` -- stagger constants, new `slideDown` exit variant
- `hooks/use-motion.ts` -- remove dead `usePressScale` hook
- `app/globals.css` -- enhance `.ios-press`, add shake keyframe, input focus transitions

**Navigation (modify):**
- `components/view-transition.tsx` -- simplify to vertical fade-up

**List components (modify):**
- `components/goals/savings-goal-card.tsx` -- fix x→y animation direction
- `components/budget-tracker.tsx` -- fix x→y direction, add spring progress bar
- `components/ui/swipeable-card.tsx` -- add height collapse on delete
- `components/meal-list.tsx` -- add stagger entrance
- `components/views/expenses-view.tsx` -- skeleton handoff, virtual row fade, empty-to-content transition

**Data viz (modify):**
- `components/animated-counter.tsx` -- refactor for value transitions + pulse
- `components/circular-progress.tsx` -- add intersection observer + spring
- `components/analytics-charts.tsx` -- add Recharts animation props
- `components/goals/savings-goal-progress.tsx` -- spring progress bar

**State transitions (modify):**
- `components/savings-goals.tsx` -- empty-to-content AnimatePresence
- `components/ui/form.tsx` -- animated error messages

**Micro-interactions (modify):**
- `components/ui/switch.tsx` -- spring thumb animation
- `components/ui/input.tsx` -- focus scale transition
- `components/ui/tabs.tsx` -- animated content swap
- `components/bottom-navigation.tsx` -- spring icon scale

---

## Task 1: Core Motion System Updates

**Files:**
- Modify: `lib/motion-system.ts:176-177`
- Modify: `hooks/use-motion.ts:104-131`
- Modify: `app/globals.css:232-236`

- [ ] **Step 1: Update stagger constants in motion-system.ts**

In `lib/motion-system.ts`, change lines 176-177:

```typescript
/** Max 40ms between items for visible cascade */
const STAGGER_DELAY = 0.04
const STAGGER_MAX_ITEMS = 12
```

- [ ] **Step 2: Remove dead usePressScale hook from use-motion.ts**

In `hooks/use-motion.ts`, delete the entire `usePressScale` section (lines 104-127) including the comment block, JSDoc, and function body. Also remove the `PRESS_ACTIVE_STYLE` constant (lines 54-56) since it's unused.

The file should go from the `useMotion` function closing brace directly to the re-export:

```typescript
  // tier 2: macro animations via motion props
  return getMotionProps(variant as VariantName, options) as UseMotionResult<V>
}

// re-export for convenience
export { springs, durations, type VariantName } from '@/lib/motion-system'
```

- [ ] **Step 3: Enhance .ios-press CSS class and add shake keyframe**

In `app/globals.css`, replace the `.ios-press` block (around line 232):

```css
  /* iOS button press */
  .ios-press {
    @apply active:scale-[0.97] active:opacity-85;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }
```

Add these keyframes after the existing splash keyframes section:

```css
  /* Error shake animation */
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-3px); }
    40% { transform: translateX(3px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(3px); }
  }

  .animate-shake {
    animation: shake 0.3s ease;
  }

  /* Reduced motion: no shake */
  @media (prefers-reduced-motion: reduce) {
    .animate-shake {
      animation: none;
    }
  }
```

- [ ] **Step 4: Verify the app builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds. No import errors from removed `usePressScale`.

- [ ] **Step 5: Commit**

```bash
git add lib/motion-system.ts hooks/use-motion.ts app/globals.css
git commit -m "feat(animation): update core motion system - stagger timing, enhanced press, shake keyframe"
```

---

## Task 2: Navigation Transition Fix

**Files:**
- Modify: `components/view-transition.tsx`

- [ ] **Step 1: Replace view-transition.tsx with simplified vertical fade-up**

Replace the entire content of `components/view-transition.tsx`:

```tsx
'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs, durations } from '@/lib/motion-system'

interface ViewTransitionProps {
  activeView: string
  children: ReactNode
}

export function ViewTransition({ activeView, children }: ViewTransitionProps) {
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={
          reducedMotion
            ? { duration: durations.micro }
            : { ...springs.ios, opacity: { duration: 0.15 } }
        }
        data-view={activeView}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

This removes: `DirectionContext`, `useNavigationDirection`, `VIEW_ORDER`, `getDirection`, `getOrchestratedVariants`, `reducedVariants`, the nested `motion.div` with blur filter, and the `willChange` style.

- [ ] **Step 2: Search for any imports of removed exports**

Run: `grep -r "useNavigationDirection\|DirectionContext" --include="*.tsx" --include="*.ts" components/ app/ hooks/ lib/`
Expected: No matches (or only the old view-transition.tsx which is now replaced). If any file imports `useNavigationDirection`, remove that import and usage.

- [ ] **Step 3: Verify the app builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/view-transition.tsx
git commit -m "feat(animation): replace horizontal slide with vertical fade-up for tab navigation"
```

---

## Task 3: List Direction Consistency

**Files:**
- Modify: `components/goals/savings-goal-card.tsx:37-40`
- Modify: `components/budget-tracker.tsx:141-146`

- [ ] **Step 1: Fix savings-goal-card entrance direction**

In `components/goals/savings-goal-card.tsx`, change lines 37-40 from:

```tsx
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: getStaggerDelay(index), duration: durations.standard }}
```

To:

```tsx
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.ios, delay: getStaggerDelay(index) }}
```

- [ ] **Step 2: Fix budget-tracker entrance direction**

In `components/budget-tracker.tsx`, change lines 141-146 from:

```tsx
            <motion.div
              key={category}
              ref={(el) => { categoryRefs.current[category] = el }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: getStaggerDelay(index), duration: durations.standard }}
```

To:

```tsx
            <motion.div
              key={category}
              ref={(el) => { categoryRefs.current[category] = el }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springs.ios, delay: getStaggerDelay(index) }}
```

- [ ] **Step 3: Commit**

```bash
git add components/goals/savings-goal-card.tsx components/budget-tracker.tsx
git commit -m "fix(animation): standardize list entrance direction to slideUp"
```

---

## Task 4: Meals List Stagger Entrance

**Files:**
- Modify: `components/meal-list.tsx:6,91-92,97-98,155-156`

- [ ] **Step 1: Add motion imports**

In `components/meal-list.tsx`, add to the imports (after line 6):

```tsx
import { motion } from 'motion/react'
import { springs, getStaggerDelay } from '@/lib/motion-system'
```

- [ ] **Step 2: Wrap each list item in motion.div**

In `components/meal-list.tsx`, change the map block. Replace lines 92-156 (the `displayedMeals.map` section):

Change the opening of the map callback from:

```tsx
        return (
          <SwipeableCard
```

To:

```tsx
        return (
          <motion.div
            key={meal.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.ios, delay: getStaggerDelay(index) }}
          >
            <SwipeableCard
```

Add the `index` parameter to the map callback -- change `displayedMeals.map((meal) => {` to `displayedMeals.map((meal, index) => {`.

And close the motion.div before the closing of the map. Change the closing `</SwipeableCard>` section:

```tsx
          </SwipeableCard>
        </motion.div>
```

Remove the `key` prop from `<SwipeableCard>` since it's now on the `<motion.div>`.

- [ ] **Step 3: Commit**

```bash
git add components/meal-list.tsx
git commit -m "feat(animation): add stagger entrance to meals list"
```

---

## Task 5: Swipeable Card Height Collapse

**Files:**
- Modify: `components/ui/swipeable-card.tsx:14,17,150-173,176`

- [ ] **Step 1: Add animate import and state for deletion**

In `components/ui/swipeable-card.tsx`, add `useCallback` to the React import (line 17):

```tsx
import { ReactNode, useCallback, useRef, useState } from 'react'
```

Add a state for tracking the collapsing phase inside the component (after line 48):

```tsx
  const [isCollapsing, setIsCollapsing] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 2: Replace handleConfirmDelete with animated version**

Replace the `handleConfirmDelete` function (lines 150-173):

```tsx
  const handleConfirmDelete = useCallback(() => {
    hapticFeedback('heavy')
    setShowDeleteDialog(false)

    // Phase 1: fade + slide out
    cardControls.start({
      opacity: 0,
      x: -60,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    }).then(() => {
      // Phase 2: collapse height
      setIsCollapsing(true)
    })
  }, [cardControls])
```

- [ ] **Step 3: Wrap the outer motion.div with a collapsible container**

Replace the outer `<motion.div>` wrapper (line 176) and its closing tag with:

```tsx
    <motion.div
      ref={wrapperRef}
      animate={isCollapsing ? {
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: 'hidden',
      } : {}}
      transition={isCollapsing ? springs.ios : {}}
      onAnimationComplete={() => {
        if (isCollapsing) {
          onDelete()
        }
      }}
    >
      <motion.div
        animate={cardControls}
        className={`relative overflow-hidden rounded-xl ${className}`}
      >
```

And close with an extra `</motion.div>` before the AlertDialog:

```tsx
      </motion.div>
    </motion.div>
```

Move the `<AlertDialog>` outside the collapsing wrapper (after the outer `</motion.div>`).

- [ ] **Step 4: Verify the app builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/ui/swipeable-card.tsx
git commit -m "feat(animation): add smooth height collapse on swipeable card delete"
```

---

## Task 6: Virtualized List Fade-In

**Files:**
- Modify: `components/views/expenses-view.tsx:198-210`

- [ ] **Step 1: Add CSS fade-in to virtual row wrappers**

In `components/views/expenses-view.tsx`, change the virtual row `<div>` (lines 198-210):

From:

```tsx
              <div
                key={item.type === 'header' ? item.key : item.expense.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
```

To:

```tsx
              <div
                key={item.type === 'header' ? item.key : item.expense.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  animation: 'fadeIn 0.15s ease forwards',
                }}
              >
```

Add the CSS keyframe in `app/globals.css` near the other keyframes:

```css
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
```

- [ ] **Step 2: Commit**

```bash
git add components/views/expenses-view.tsx app/globals.css
git commit -m "feat(animation): add fade-in for virtualized expense list rows"
```

---

## Task 7: Skeleton-to-Content Handoff

**Files:**
- Modify: `components/views/expenses-view.tsx:10,117-125`

- [ ] **Step 1: Wrap skeleton loading state with AnimatePresence exit**

In `components/views/expenses-view.tsx`, change the loading block (lines 117-125).

From:

```tsx
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <ExpenseCardSkeleton key={i} />
        ))}
      </div>
    );
  }
```

To:

```tsx
  if (loading) {
    return (
      <motion.div
        className="space-y-3"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {[1, 2, 3, 4].map((i) => (
          <ExpenseCardSkeleton key={i} />
        ))}
      </motion.div>
    );
  }
```

Note: The parent component that renders `<ExpensesView>` needs to wrap the conditional rendering in `<AnimatePresence>` for the `exit` prop to fire. If the parent already uses AnimatePresence (check the parent), this works as-is. If not, the skeleton will simply unmount without exit animation -- which is acceptable as a progressive enhancement.

- [ ] **Step 2: Commit**

```bash
git add components/views/expenses-view.tsx
git commit -m "feat(animation): add skeleton exit fade for loading-to-content handoff"
```

---

## Task 8: AnimatedCounter Refactor

**Files:**
- Modify: `components/animated-counter.tsx`

- [ ] **Step 1: Refactor AnimatedCounter with value tracking and pulse**

Replace the entire content of `components/animated-counter.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  locale?: string
  pulse?: boolean
}

export function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  locale = 'vi-VN',
  pulse = false,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const prevValueRef = useRef<number | null>(null)
  const hasAnimatedRef = useRef(false)
  const [isPulsing, setIsPulsing] = useState(false)
  const { ref, inView } = useInView({ triggerOnce: false, threshold: 0.1 })

  useEffect(() => {
    if (!inView) return

    const from = hasAnimatedRef.current && prevValueRef.current !== null
      ? prevValueRef.current
      : 0
    const to = value

    // Skip animation if value hasn't changed
    if (hasAnimatedRef.current && from === to) return

    prevValueRef.current = value
    hasAnimatedRef.current = true

    // Trigger pulse on value change (not initial)
    if (pulse && from !== 0) {
      setIsPulsing(true)
      setTimeout(() => setIsPulsing(false), 300)
    }

    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      setCount(from + (to - from) * easeProgress)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setCount(to)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [value, duration, inView, pulse])

  const pulseStyle: React.CSSProperties = isPulsing
    ? { transform: 'scale(1.04)', transition: 'transform 0.15s cubic-bezier(0.22, 1, 0.36, 1)' }
    : { transform: 'scale(1)', transition: 'transform 0.15s cubic-bezier(0.22, 1, 0.36, 1)' }

  return (
    <span ref={ref} className={className} style={pulse ? pulseStyle : undefined}>
      {prefix}
      {count.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}
```

Key changes:
- `prevValueRef` tracks previous value for old→new transitions
- `hasAnimatedRef` distinguishes first mount (0→target) from subsequent changes (old→new)
- `pulse` prop adds a scale pulse on value change (CSS transition, not spring -- matches tier 1)
- `triggerOnce` changed to `false` so re-entering viewport with a new value still animates

- [ ] **Step 2: Verify the app builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/animated-counter.tsx
git commit -m "feat(animation): refactor AnimatedCounter with value transitions and pulse"
```

---

## Task 9: Progress Bar Springs

**Files:**
- Modify: `components/goals/savings-goal-progress.tsx`
- Modify: `components/budget-tracker.tsx:217-222`

- [ ] **Step 1: Add intersection observer and spring to savings-goal-progress**

Replace the entire content of `components/goals/savings-goal-progress.tsx`:

```tsx
'use client'

import { formatCurrency } from '@/lib/utils'
import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { useInView } from 'react-intersection-observer'

interface SavingsGoalProgressProps {
  progress: number
  remaining: number
  isCompleted: boolean
}

export function SavingsGoalProgress({
  progress,
  remaining,
  isCompleted,
}: SavingsGoalProgressProps) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <div className="space-y-2" ref={ref}>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${Math.min(progress, 100)}%` } : { width: 0 }}
          transition={springs.ios}
          className={`h-full rounded-full ${
            isCompleted ? 'bg-green-500' : 'bg-primary'
          }`}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="ios-caption text-muted-foreground">
          {progress.toFixed(0)}% complete
        </span>
        <span className={`ios-caption font-medium ${isCompleted ? 'text-green-500' : ''}`}>
          {isCompleted ? 'Goal reached! 🎉' : `${formatCurrency(remaining, 'VND')} to go`}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add spring to budget-tracker progress bar**

In `components/budget-tracker.tsx`, add `springs` to the existing import from motion-system if not already there (line 9 already imports it).

Add `useInView` import:

```tsx
import { useInView } from 'react-intersection-observer'
```

Change the budget progress bar transition (around line 219-222). From:

```tsx
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
```

To:

```tsx
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={springs.ios}
```

Note: The budget items are already in a list that renders on mount inside a visible container, so viewport triggering isn't critical here. The spring transition alone provides the overshoot effect.

- [ ] **Step 3: Commit**

```bash
git add components/goals/savings-goal-progress.tsx components/budget-tracker.tsx
git commit -m "feat(animation): add spring physics to progress bars with viewport trigger"
```

---

## Task 10: Circular Progress Spring + Viewport Trigger

**Files:**
- Modify: `components/circular-progress.tsx`

- [ ] **Step 1: Add intersection observer and spring to CircularProgress**

Replace the entire content of `components/circular-progress.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { springs } from '@/lib/motion-system'
import { useInView } from 'react-intersection-observer'

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  showValue?: boolean
  valueFormatter?: (value: number) => string
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

const COLOR_CLASSES = {
  primary: 'stroke-primary',
  success: 'stroke-green-500',
  warning: 'stroke-yellow-500',
  danger: 'stroke-orange-500',
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  showValue = true,
  valueFormatter = (v) => `${Math.round(v)}%`,
  color = 'primary',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const progressColor =
    color === 'primary'
      ? value >= 100
        ? 'danger'
        : value >= 80
        ? 'warning'
        : 'success'
      : color

  return (
    <div
      ref={ref}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          transition={springs.ios}
          className={cn(COLOR_CLASSES[progressColor])}
        />
      </svg>
      {showValue && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ ...springs.ios, delay: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="text-sm font-semibold">
            {valueFormatter(value)}
          </span>
        </motion.div>
      )}
    </div>
  )
}

export function MiniCircularProgress({
  value,
  size = 40,
  className,
}: {
  value: number
  size?: number
  className?: string
}) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const progressColor =
    value >= 100 ? 'danger' : value >= 80 ? 'warning' : 'success'

  return (
    <div
      ref={ref}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          transition={{ ...springs.ios, duration: 0.8 }}
          className={cn(COLOR_CLASSES[progressColor])}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold">{Math.round(value)}%</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/circular-progress.tsx
git commit -m "feat(animation): add spring physics and viewport trigger to circular progress"
```

---

## Task 11: Recharts Animation Props

**Files:**
- Modify: `components/analytics-charts.tsx:125-136,238-244`

- [ ] **Step 1: Add animation props to PieChart**

In `components/analytics-charts.tsx`, update the `<Pie>` element (around line 125):

From:

```tsx
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              onClick={(data) => handleCategoryClick(data.name)}
              style={{ cursor: 'pointer' }}
              paddingAngle={2}
            >
```

To:

```tsx
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              onClick={(data) => handleCategoryClick(data.name)}
              style={{ cursor: 'pointer' }}
              paddingAngle={2}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
              animationBegin={100}
            >
```

- [ ] **Step 2: Add animation props to LineChart**

In `components/analytics-charts.tsx`, update the `<Line>` element (around line 238):

From:

```tsx
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
```

To:

```tsx
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
              animationBegin={200}
            />
```

- [ ] **Step 3: Commit**

```bash
git add components/analytics-charts.tsx
git commit -m "feat(animation): add Recharts native animation to pie and line charts"
```

---

## Task 12: Empty-to-Content Transition

**Files:**
- Modify: `components/views/expenses-view.tsx:127-151`
- Modify: `components/savings-goals.tsx:86-94`

- [ ] **Step 1: Wrap expenses empty state in AnimatePresence**

In `components/views/expenses-view.tsx`, the empty states and list are already rendered conditionally. Wrap the empty-state returns with exit animations.

Change the empty state block (lines 128-151). Add a `key` and exit animation to both EmptyState wrappers:

```tsx
  if (expenses.length === 0) {
    return (
      <motion.div
        key="empty-expenses"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.1 }}
      >
        <EmptyState
          icon="💸"
          title="No expenses yet"
          description="Start tracking your spending by adding an expense manually or syncing your emails"
          size="lg"
          animationVariant="bounce"
          data-testid="empty-expenses"
          action={{
            label: 'Add Your First Expense',
            onClick: onShowForm,
            icon: <Plus className="h-5 w-5" />,
          }}
          secondaryAction={{
            label: 'Or Sync from Email',
            onClick: onSync,
            variant: 'outline',
            icon: <RefreshCw className="h-5 w-5" />,
            loading: isSyncing,
          }}
        />
      </motion.div>
    )
  }
```

Note: For the `exit` to fire, the parent rendering `<ExpensesView>` would need to use `AnimatePresence`. Since the component returns early, the transition is best-effort -- it will work when items are added and the component re-renders from empty to populated within the same parent.

- [ ] **Step 2: Wrap savings-goals empty state similarly**

In `components/savings-goals.tsx`, change the empty state block (around lines 87-93):

From:

```tsx
        <EmptyState
          icon={<Target className="h-16 w-16 text-primary" />}
          title="No Goals Yet"
          description="Create your first savings goal to start tracking your progress"
          animationVariant="pulse"
        />
```

To:

```tsx
        <motion.div
          key="empty-goals"
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.1 }}
        >
          <EmptyState
            icon={<Target className="h-16 w-16 text-primary" />}
            title="No Goals Yet"
            description="Create your first savings goal to start tracking your progress"
            animationVariant="pulse"
          />
        </motion.div>
```

Make sure `motion` is imported from `'motion/react'` in this file (check existing imports).

- [ ] **Step 3: Commit**

```bash
git add components/views/expenses-view.tsx components/savings-goals.tsx
git commit -m "feat(animation): add exit animation to empty states for content transitions"
```

---

## Task 13: Animated Error Messages

**Files:**
- Modify: `components/ui/form.tsx:145-167`

- [ ] **Step 1: Add animated FormMessage**

In `components/ui/form.tsx`, add motion import at the top:

```tsx
import { AnimatePresence, motion } from 'motion/react'
```

Replace the `FormMessage` component (lines 145-167):

```tsx
const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : children

  return (
    <AnimatePresence mode="wait">
      {body && (
        <motion.p
          ref={ref}
          id={formMessageId}
          key={String(body)}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn("text-sm font-medium text-destructive", className)}
          {...props}
        >
          {body}
        </motion.p>
      )}
    </AnimatePresence>
  )
})
FormMessage.displayName = "FormMessage"
```

- [ ] **Step 2: Add shake class to FormControl on error**

This is optional -- the shake needs to be applied by consumers to their input wrapper. The CSS `.animate-shake` class was already added in Task 1. Consumers can add it conditionally:

```tsx
<div className={error ? 'animate-shake' : ''}>
  <FormControl><Input /></FormControl>
</div>
```

No framework-level change needed; this is a per-form opt-in.

- [ ] **Step 3: Commit**

```bash
git add components/ui/form.tsx
git commit -m "feat(animation): add slide-down entrance to form error messages"
```

---

## Task 14: Tabs Content Animation

**Files:**
- Modify: `components/ui/tabs.tsx`

- [ ] **Step 1: Add animated TabsContent**

Replace the entire content of `components/ui/tabs.tsx`:

```tsx
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion, AnimatePresence } from 'motion/react'

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  >
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  </TabsPrimitive.Content>
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

Note: Radix `TabsContent` handles mount/unmount of inactive content via `forceMount`. The `motion.div` inside fades in the content when the tab becomes active. This automatically applies to all Radix tab usages across the app.

- [ ] **Step 2: Verify the app builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ui/tabs.tsx
git commit -m "feat(animation): add fade-in animation to Radix Tabs content swap"
```

---

## Task 15: Input Focus Animation

**Files:**
- Modify: `components/ui/input.tsx`

- [ ] **Step 1: Add focus scale transition to Input**

Replace the className in `components/ui/input.tsx`:

From:

```tsx
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
```

To:

```tsx
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-[border-color,box-shadow,transform] duration-150 focus-visible:scale-[1.005]",
```

The added classes: `transition-[border-color,box-shadow,transform] duration-150 focus-visible:scale-[1.005]`

This adds a CSS transition for border color, box shadow, and transform with 150ms duration, plus a subtle scale-up on focus.

- [ ] **Step 2: Commit**

```bash
git add components/ui/input.tsx
git commit -m "feat(animation): add subtle focus scale transition to inputs"
```

---

## Task 16: Switch Spring Animation

**Files:**
- Modify: `components/ui/switch.tsx`

- [ ] **Step 1: Replace CSS transition with spring-animated thumb**

Replace the entire content of `components/ui/switch.tsx`:

```tsx
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const [checked, setChecked] = React.useState(props.defaultChecked ?? false)

  const isChecked = props.checked ?? checked

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        className
      )}
      {...props}
      ref={ref}
      onCheckedChange={(val) => {
        setChecked(val)
        props.onCheckedChange?.(val)
      }}
    >
      <SwitchPrimitives.Thumb asChild>
        <motion.span
          className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0"
          animate={{ x: isChecked ? 20 : 0 }}
          transition={springs.touch}
        />
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
```

Key changes:
- Track checked state locally to drive `motion.span` animate
- Thumb uses `springs.touch` (damping: 22, stiffness: 400) for overshoot snap
- Track color still uses CSS `transition-colors duration-150`
- `asChild` on Thumb so Radix renders the motion span as the thumb

- [ ] **Step 2: Verify the app builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ui/switch.tsx
git commit -m "feat(animation): add spring physics to toggle switch thumb"
```

---

## Task 17: Bottom Nav Spring Icons

**Files:**
- Modify: `components/bottom-navigation.tsx:51-91`

- [ ] **Step 1: Replace CSS scale with motion.div spring**

In `components/bottom-navigation.tsx`, update the `renderNavItem` function. Change the icon wrapper div (lines 66-77):

From:

```tsx
        {/* Icon - using CSS transform for better performance */}
        <div
          className={`relative mb-1 transition-transform duration-200 ease-out ${
            isActive ? 'scale-100' : 'scale-[0.94]'
          }`}
        >
          <Icon
            className={`h-6 w-6 transition-colors duration-200 ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </div>
```

To:

```tsx
        <motion.div
          className="relative mb-1"
          animate={{ scale: isActive ? 1 : 0.94 }}
          transition={springs.touch}
        >
          <Icon
            className={`h-6 w-6 transition-colors duration-200 ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </motion.div>
```

- [ ] **Step 2: Commit**

```bash
git add components/bottom-navigation.tsx
git commit -m "feat(animation): replace CSS scale with spring physics on nav icons"
```

---

## Task 18: Success Feedback on New Items

**Files:**
- Modify: `components/expandable-expense-card.tsx`

- [ ] **Step 1: Add success highlight prop**

In `components/expandable-expense-card.tsx`, add a prop to accept a `isNew` boolean that triggers the cinematic spring and green flash. Add to the component's interface:

```tsx
  isNew?: boolean
```

On the outer `motion.div` of the card, conditionally use `springs.cinematic` instead of the default transition when `isNew` is true. Add an inline style for the green tint flash:

```tsx
style={isNew ? {
  animation: 'greenFlash 0.3s ease forwards',
} : undefined}
```

Add the CSS keyframe in `app/globals.css`:

```css
  @keyframes greenFlash {
    0% { background-color: rgba(34, 197, 94, 0.15); }
    100% { background-color: transparent; }
  }
```

The parent (`expenses-view.tsx`) can pass `isNew` by comparing the expense ID against a "most recently added" ref, which resets after animation completes. This is an opt-in enhancement -- expense items work without it.

- [ ] **Step 2: Commit**

```bash
git add components/expandable-expense-card.tsx app/globals.css
git commit -m "feat(animation): add success feedback flash for newly added items"
```

---

## Task 19: Final Build Verification

- [ ] **Step 1: Full build check**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Check for any remaining usePressScale imports**

Run: `grep -r "usePressScale" --include="*.tsx" --include="*.ts" components/ app/ hooks/ lib/`
Expected: No matches.

- [ ] **Step 3: Check for any remaining useNavigationDirection imports**

Run: `grep -r "useNavigationDirection" --include="*.tsx" --include="*.ts" components/ app/ hooks/ lib/`
Expected: No matches.

- [ ] **Step 4: Commit any remaining fixes if needed**
