# iOS-Native Animation Improvement Plan

> **Created:** 2026-01-04
> **Status:** Planned
> **Library:** Framer Motion (keeping, optimizing usage)

## Summary

Fix janky Framer Motion animations by creating a centralized animation system, removing performance anti-patterns, and standardizing to iOS-like spring physics.

---

## Current Issues Identified

| Issue | Severity | Impact |
|-------|----------|--------|
| Inconsistent spring configs (5+ variations) | High | Unpredictable feel |
| Height animations causing layout thrashing | High | Jank during expand/collapse |
| Blur filter in exit animations | Medium | GPU overhead on mobile |
| `layout` prop on list items | Medium | Jank on list updates |
| Inconsistent stagger timing (0.02s - 0.1s) | Low | Inconsistent rhythm |

### Spring Config Variations Found

```typescript
// Currently scattered across 76+ files:
{ damping: 20, stiffness: 300 }  // Most common
{ damping: 20, stiffness: 400 }  // Stiffer
{ damping: 25, stiffness: 300 }  // Softer
{ damping: 30, stiffness: 300 }  // More damped
{ damping: 30, stiffness: 250 }  // Gentle
```

### Performance Anti-Patterns Found

1. **Height Animation** - `animate={{ height: 'auto' }}` causes layout recalculation every frame
2. **Blur Filter** - `exit={{ filter: 'blur(4px)' }}` expensive on mobile GPUs
3. **Layout Prop** - `<motion.div layout>` on list items causes jank
4. **Color Animation** - Animating `color` via Framer instead of CSS transitions

---

## Implementation Plan

### Phase 1: Create Animation System (Critical)

**New file: `lib/animation-config.ts`**

```typescript
// Centralized animation constants

// SPRINGS - iOS-calibrated physics
export const springs = {
  default: { type: 'spring', damping: 25, stiffness: 300, mass: 1 },
  snappy: { type: 'spring', damping: 20, stiffness: 400, mass: 0.8 },
  gentle: { type: 'spring', damping: 30, stiffness: 250, mass: 1 },
  bouncy: { type: 'spring', damping: 15, stiffness: 300, mass: 0.8 },
  stiff: { type: 'spring', damping: 35, stiffness: 500, mass: 1 },
}

// EASINGS - iOS standard curves
export const easings = {
  ios: [0.4, 0, 0.2, 1],      // Default iOS ease
  iosOut: [0, 0, 0.2, 1],     // Ease out
  iosIn: [0.4, 0, 1, 1],      // Ease in
  overshoot: [0.175, 0.885, 0.32, 1.275],
}

// DURATIONS - Consistent timing
export const durations = {
  instant: 0.05,  // 50ms - micro-interactions
  fast: 0.15,     // 150ms - quick feedback
  normal: 0.25,   // 250ms - most transitions
  medium: 0.35,   // 350ms - larger elements
  slow: 0.5,      // 500ms - dramatic entrances
  progress: 0.6,  // 600ms - progress bars
}

// STAGGER - List animation timing
export const stagger = {
  fast: 0.03,     // 30ms - FAB items
  normal: 0.05,   // 50ms - most lists (STANDARD)
  slow: 0.08,     // 80ms - dramatic reveals
  maxItems: 10,   // Cap stagger count
}

// VARIANTS - Pre-built animation states
export const variants = {
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  scaleFade: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  bottomSheet: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  },
  listItem: {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 },
  },
}

// HELPERS
export function getStaggerDelay(index: number, timing: 'fast' | 'normal' | 'slow' = 'normal') {
  return Math.min(index, stagger.maxItems) * stagger[timing]
}
```

---

### Phase 2: Add CSS Utilities

**Update: `app/globals.css`**

```css
/* GPU Acceleration Utilities */

.gpu-accelerate {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform, opacity;
}

.will-animate {
  will-change: transform;
}

.will-animate-all {
  will-change: transform, opacity;
}

.contain-paint {
  contain: paint;
}

.contain-layout {
  contain: layout;
}

.animated-list {
  contain: layout style;
}

@media (prefers-reduced-motion: reduce) {
  .motion-safe {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### Phase 3: Fix High-Priority Components

#### 3.1 `components/expandable-expense-card.tsx`

**Problem:** Animates `height` causing layout thrashing

```typescript
// BEFORE (lines 103-114):
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: contentHeight, opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
>

// AFTER:
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={springs.default}
  className="overflow-hidden will-animate-all"
>
  <motion.div
    initial={{ y: -10 }}
    animate={{ y: 0 }}
    exit={{ y: -10 }}
    transition={springs.default}
  >
```

#### 3.2 `components/views/expenses-view.tsx`

**Problem:** Uses `blur` filter and `layout` prop

```typescript
// BEFORE (lines 168-179):
<motion.div
  layout  // REMOVE THIS
  exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}  // REMOVE blur
  transition={{ delay: index * 0.05 }}  // REPLACE
>

// AFTER:
import { springs, variants, getStaggerDelay } from '@/lib/animation-config'

<motion.div
  {...variants.listItem}
  transition={{
    ...springs.default,
    delay: getStaggerDelay(index),
  }}
  className="will-animate-all"
>
```

#### 3.3 `components/quick-expense-form.tsx`

**Problem:** Height animation in notes section

```typescript
// BEFORE (lines 286-290):
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
>

// AFTER:
<motion.div
  initial={{ opacity: 0, y: -8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={springs.default}
>
```

---

### Phase 4: Standardize Sheet Components

Apply `springs.gentle` to all sheets:

| File | Current | Update To |
|------|---------|-----------|
| `filter-sheet.tsx` | custom ease | `springs.gentle` |
| `exercise-picker-sheet.tsx` | `damping: 30, stiffness: 300` | `springs.gentle` |
| `exercise-detail-sheet.tsx` | `damping: 30, stiffness: 300` | `springs.gentle` |
| `meal-filter-sheet.tsx` | custom ease | `springs.gentle` |
| `set-budget-dialog.tsx` | `damping: 30, stiffness: 300` | `springs.gentle` |
| `workouts/TemplateFormDialog.tsx` | varies | `springs.gentle` |
| `workouts/WorkoutScheduleSheet.tsx` | varies | `springs.gentle` |
| `workouts/WorkoutAnalyticsSheet.tsx` | varies | `springs.gentle` |
| `workouts/TemplateDetailSheet.tsx` | varies | `springs.gentle` |

---

### Phase 5: Fix Navigation & FAB

#### `components/bottom-navigation.tsx`

**Problem:** Animates `color` via Framer Motion (expensive)

```typescript
// BEFORE (lines 65-69):
<motion.span
  animate={{
    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
  }}
>

// AFTER - Use CSS transition:
<span
  className={`transition-colors duration-200 ${
    isActive ? 'text-primary' : 'text-muted-foreground'
  }`}
>
```

#### `components/floating-action-menu.tsx`

**Problem:** Inconsistent stagger timing

```typescript
// BEFORE:
transition={{ delay: index * 0.04, damping: 20, stiffness: 400 }}

// AFTER:
import { springs, getStaggerDelay } from '@/lib/animation-config'

transition={{
  ...springs.snappy,
  delay: getStaggerDelay(index, 'fast'),
}}
```

---

### Phase 6: Remove Layout Prop from Lists

Remove `layout` prop from these components (causes jank):

- `components/budget-alerts.tsx` (line 111)
- `components/expense-card.tsx` (line 102)
- `components/meal-planner.tsx` (line 323)
- `components/goals/savings-goal-card.tsx` (line 37)

Use `AnimatePresence mode="popLayout"` on parent instead.

---

### Phase 7: Standardize Stagger Timing

**Current variations:**
- `index * 0.02` (20ms)
- `index * 0.03` (30ms)
- `index * 0.04` (40ms)
- `index * 0.05` (50ms) - **STANDARD**
- `index * 0.08` (80ms)
- `index * 0.1` (100ms)

**Replace all with `getStaggerDelay()` helper:**

```typescript
// Normal lists (50ms):
delay: getStaggerDelay(index)

// Quick lists like FAB (30ms):
delay: getStaggerDelay(index, 'fast')

// Dramatic reveals (80ms):
delay: getStaggerDelay(index, 'slow')
```

---

## iOS Animation Principles Applied

| Principle | Implementation |
|-----------|----------------|
| Spring physics | `damping: 25, stiffness: 300` as default |
| GPU-only properties | Only animate `transform` and `opacity` |
| Consistent timing | Standardized durations and stagger |
| Natural deceleration | iOS easing `[0.4, 0, 0.2, 1]` |
| Responsive feel | `snappy` spring for buttons/toggles |
| Gentle modals | `gentle` spring for sheets/dialogs |
| Playful feedback | `bouncy` spring for success states |

---

## Files to Modify

### New Files
- `lib/animation-config.ts` - Animation system (single source of truth)

### Critical Updates (High Priority)
1. `app/globals.css` - Add GPU utilities
2. `components/expandable-expense-card.tsx` - Remove height animation
3. `components/views/expenses-view.tsx` - Remove blur/layout
4. `components/bottom-navigation.tsx` - CSS color transition
5. `components/quick-expense-form.tsx` - Standardize sheet

### Sheet Components (Medium Priority)
6. `components/filter-sheet.tsx`
7. `components/exercise-picker-sheet.tsx`
8. `components/exercise-detail-sheet.tsx`
9. `components/meal-filter-sheet.tsx`
10. `components/set-budget-dialog.tsx`
11. `components/workouts/TemplateFormDialog.tsx`
12. `components/workouts/WorkoutScheduleSheet.tsx`
13. `components/workouts/WorkoutAnalyticsSheet.tsx`
14. `components/workouts/TemplateDetailSheet.tsx`

### List Components (Low Priority - Batch Update)
15. `components/budget-alerts.tsx`
16. `components/floating-action-menu.tsx`
17. `components/expense-card.tsx`
18. `components/meal-planner.tsx`
19. `components/goals/savings-goal-card.tsx`
20. Multiple workout components

---

## Expected Results

- **60fps animations** - No layout thrashing
- **Consistent feel** - Same spring physics everywhere
- **iOS-native** - Matches system animation curves
- **Reduced bundle** - Removed redundant inline configs
- **Maintainable** - Single source of truth for animation values
- **Accessible** - Respects `prefers-reduced-motion`

---

## Testing Checklist

- [ ] Chrome DevTools Performance - No forced reflows during animations
- [ ] GPU Layers panel - Animated elements use GPU layers
- [ ] Mobile device test - 60fps on mid-range phones
- [ ] `prefers-reduced-motion` - Animations respect user preference
- [ ] Visual consistency - All similar interactions feel the same
