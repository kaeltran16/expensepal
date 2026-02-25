# Cinematic Animation Overhaul -- Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform ExpensePal's animation system from functional-but-boring to polished-and-cinematic across 3 incremental phases.

**Architecture:** Extend the existing `motion-system.ts` foundation with scroll-linked primitives (Phase 1), orchestrated transition variants (Phase 2), and micro-interaction components (Phase 3). Each phase is independently shippable. All animations degrade gracefully via existing `prefers-reduced-motion` support.

**Tech Stack:** Motion (v12.34.3), react-intersection-observer, Next.js 14, TypeScript, Tailwind CSS.

---

## Phase 1: Scroll-Driven Depth

### Task 1: Extend motion-system with choreography presets

**Files:**
- Modify: `lib/motion-system.ts`

**Step 1: Add new spring and variant presets**

Add after the existing `springs` object (line 45):

```typescript
// in springs object, add:
/** Cinematic entrance - softer, more dramatic */
cinematic: {
  type: 'spring' as const,
  damping: 20,
  stiffness: 200,
  mass: 1.2,
},
```

Add after the existing `variants` object (line 101):

```typescript
export const choreography = {
  /** Viewport reveal - larger travel for dramatic entrance */
  reveal: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  /** Subtle reveal for list items */
  revealSubtle: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
  },
  /** Orchestrated container - drives staggerChildren */
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
    exit: {
      transition: {
        staggerChildren: 0.03,
        staggerDirection: -1,
      },
    },
  },
  /** Child item for stagger container */
  staggerItem: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
} as const

export const reducedChoreography: Record<keyof typeof choreography, typeof variants.fade> = {
  reveal: variants.fade,
  revealSubtle: variants.fade,
  staggerContainer: { initial: {}, animate: {}, exit: {} } as any,
  staggerItem: variants.fade,
}
```

Update the `VariantName` type to include choreography:

```typescript
export type ChoreographyName = keyof typeof choreography
```

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20` (or `npm run build`)
Expected: Build succeeds, no type errors.

**Step 3: Commit**

```
git add lib/motion-system.ts
git commit -m "feat(animation): add cinematic spring and choreography presets"
```

---

### Task 2: Create ScrollReveal component

**Files:**
- Create: `components/ui/scroll-reveal.tsx`

**Step 1: Create the ScrollReveal wrapper**

```tsx
'use client'

import { motion } from 'motion/react'
import { useInView } from 'react-intersection-observer'
import { type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs, choreography, reducedChoreography } from '@/lib/motion-system'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  /** Which choreography variant to use */
  variant?: 'reveal' | 'revealSubtle'
  /** Delay in seconds */
  delay?: number
  /** Viewport threshold (0-1) */
  threshold?: number
  /** Only animate once */
  once?: boolean
}

export function ScrollReveal({
  children,
  className,
  variant = 'reveal',
  delay = 0,
  threshold = 0.15,
  once = true,
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ triggerOnce: once, threshold })

  const v = reducedMotion ? reducedChoreography[variant] : choreography[variant]
  const transition = reducedMotion
    ? { duration: 0.1 }
    : { ...springs.cinematic, delay }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={v.initial}
      animate={inView ? v.animate : v.initial}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}
```

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 3: Commit**

```
git add components/ui/scroll-reveal.tsx
git commit -m "feat(animation): add ScrollReveal viewport-triggered component"
```

---

### Task 3: Create CollapsingHeader component

**Files:**
- Create: `components/collapsing-header.tsx`

**Step 1: Build the scroll-linked collapsing header**

```tsx
'use client'

import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import type { ViewType } from '@/lib/constants/filters'

interface CollapsingHeaderProps {
  activeView: ViewType
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

const VIEW_TITLES: Record<ViewType, string> = {
  feed: 'Today',
  expenses: 'Expenses',
  budget: 'Budget',
  goals: 'Goals',
  calories: 'Calories',
  recurring: 'Recurring',
  summary: 'Summary',
  insights: 'Insights',
  workouts: 'Workouts',
  profile: 'Profile',
  routines: 'Routines',
}

const SCROLL_RANGE = [0, 120]

export function CollapsingHeader({ activeView, scrollContainerRef }: CollapsingHeaderProps) {
  const reducedMotion = useReducedMotion()
  const title = VIEW_TITLES[activeView]

  const { scrollY } = useScroll({ container: scrollContainerRef })

  // scroll-linked transforms
  const largeTitleOpacity = useTransform(scrollY, SCROLL_RANGE, [1, 0])
  const largeTitleScale = useTransform(scrollY, SCROLL_RANGE, [1, 0.85])
  const largeTitleHeight = useTransform(scrollY, SCROLL_RANGE, [48, 0])
  const backgroundOpacity = useTransform(scrollY, [60, 120], [0, 0.9])
  const blurAmount = useTransform(scrollY, [60, 120], [0, 20])
  const borderOpacity = useTransform(scrollY, [100, 120], [0, 1])

  // track scrolled state for conditional classes
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 100)
  })

  if (reducedMotion) {
    return (
      <div
        className="sticky z-40 px-4 pt-4 pb-4"
        style={{
          backgroundColor: scrolled ? 'rgba(var(--background-rgb), 0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '0.5px solid rgba(var(--ios-separator))' : 'none',
        }}
      >
        <h1 className="ios-large-title">{title}</h1>
      </div>
    )
  }

  return (
    <motion.div
      className="sticky z-40 px-4 pt-4 pb-3"
      style={{
        backgroundColor: `rgba(var(--background-rgb), ${backgroundOpacity})` as any,
        willChange: 'backdrop-filter',
      }}
    >
      {/* blur backdrop - using a separate layer for performance */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{
          backdropFilter: useTransform(blurAmount, (v) => `blur(${v}px) saturate(180%)`),
          WebkitBackdropFilter: useTransform(blurAmount, (v) => `blur(${v}px) saturate(180%)`),
        }}
      />

      {/* bottom border */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          backgroundColor: 'rgba(var(--ios-separator))',
          opacity: borderOpacity,
        }}
      />

      {/* large title - collapses on scroll */}
      <motion.div
        className="overflow-hidden"
        style={{
          height: largeTitleHeight,
          opacity: largeTitleOpacity,
          scale: largeTitleScale,
          transformOrigin: 'left center',
        }}
      >
        <h1 className="ios-large-title whitespace-nowrap">{title}</h1>
      </motion.div>
    </motion.div>
  )
}
```

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 3: Commit**

```
git add components/collapsing-header.tsx
git commit -m "feat(animation): add CollapsingHeader with scroll-linked transforms"
```

---

### Task 4: Integrate CollapsingHeader into app/page.tsx

**Files:**
- Modify: `app/page.tsx:5-6` (imports)
- Modify: `app/page.tsx:329-355` (remove scroll handler)
- Modify: `app/page.tsx:474` (replace PageHeader)

**Step 1: Replace PageHeader import with CollapsingHeader**

In `app/page.tsx`, replace:
```typescript
import { PageHeader } from '@/components/page-header';
```
with:
```typescript
import { CollapsingHeader } from '@/components/collapsing-header';
```

**Step 2: Remove the manual scroll detection useEffect**

Remove lines 329-355 (the `useEffect` with `handleScroll`) and the `scrolled` state (line 156) and `lastScrollY` ref (line 157).

Remove:
```typescript
const [scrolled, setScrolled] = useState(false);
const lastScrollY = useRef(0);
```

Remove the entire `useEffect` block:
```typescript
// Scroll detection for sticky header
useEffect(() => {
  const handleScroll = () => {
    ...
  };
  ...
}, []);
```

**Step 3: Replace PageHeader with CollapsingHeader**

Replace line 474:
```tsx
<PageHeader activeView={activeView} scrolled={scrolled} />
```
with:
```tsx
<CollapsingHeader activeView={activeView} scrollContainerRef={contentRef} />
```

**Step 4: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 5: Manual verification**

Run: `npm run dev`
- Open browser, scroll the main content
- Header should smoothly compress as you scroll down (0-120px range)
- Frosted blur should fade in as the header compresses
- Scrolling back up should reverse the animation smoothly
- Test on both light and dark themes

**Step 6: Commit**

```
git add app/page.tsx
git commit -m "feat(animation): integrate CollapsingHeader replacing boolean scroll toggle"
```

---

### Task 5: Apply ScrollReveal to feed cards

**Files:**
- Modify: `components/views/feed-view.tsx:194-256`

**Step 1: Replace hard-coded motion.div wrappers with ScrollReveal**

In `feed-view.tsx`, add import:
```typescript
import { ScrollReveal } from '@/components/ui/scroll-reveal'
```

Remove the import of `getStaggerDelay` from motion-system (line 5):
```typescript
import { springs } from '@/lib/motion-system'
```

Replace each `<motion.div initial={...} animate={...} transition={...}>` wrapper around the feed cards (lines 194-215, 217-236, 238-256) with `<ScrollReveal>`:

Replace the spending card wrapper:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...springs.ios, delay: getStaggerDelay(0) }}
>
```
with:
```tsx
<ScrollReveal delay={0}>
```

Replace the calories card wrapper:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...springs.ios, delay: getStaggerDelay(1) }}
>
```
with:
```tsx
<ScrollReveal delay={0.08}>
```

Replace the routine card wrapper:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...springs.ios, delay: getStaggerDelay(2) }}
>
```
with:
```tsx
<ScrollReveal delay={0.16}>
```

Close each with `</ScrollReveal>` instead of `</motion.div>`.

Also remove `motion` from the import on line 4 if no longer used. Check if `motion` is still needed elsewhere in the file -- it's used in `FeedCardSkeleton` indirectly (no, it uses plain divs). If `motion` is not needed, remove it. If `springs` is not needed, remove it.

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 3: Manual verification**

Run: `npm run dev`
- Navigate to the feed view
- Cards should slide up into view with a cinematic feel (y: 40 travel, staggered 80ms apart)
- Each card should only animate when it enters the viewport
- If you scroll fast past a card and back, it should already be visible (triggerOnce)

**Step 4: Commit**

```
git add components/views/feed-view.tsx
git commit -m "feat(animation): apply ScrollReveal to feed cards for viewport-triggered entrance"
```

---

### Task 6: Add scroll-linked depth parallax to feed

**Files:**
- Modify: `components/views/feed-view.tsx`

**Step 1: Add parallax effect to section headers**

This task adds a subtle parallax effect where background decorative elements (like section headers or dividers between cards) move slightly slower than the content. Since the feed view is simple (3 stacked cards), we'll add a parallax offset to the `ScrollReveal` component instead.

In `components/ui/scroll-reveal.tsx`, add an optional `parallax` prop:

```tsx
// add to ScrollRevealProps interface
/** Parallax factor: 0 = no parallax, negative = slower than scroll */
parallaxY?: number
```

In the component body, add:
```tsx
import { useScroll, useTransform } from 'motion/react'

// inside the component, after the useInView call:
const { scrollY } = useScroll()
const parallaxOffset = useTransform(scrollY, (v) => v * (parallaxY ?? 0))
```

And modify the motion.div style to include the parallax:
```tsx
<motion.div
  ref={ref}
  className={className}
  initial={v.initial}
  animate={inView ? v.animate : v.initial}
  transition={transition}
  style={parallaxY ? { y: parallaxOffset } : undefined}
>
```

**Note:** Only add the `y` style override when parallax is requested, so it doesn't interfere with the initial/animate y values. The parallax `y` motion value will be added **on top of** the animation y via a wrapper approach -- actually, this conflicts. Instead, use a **separate wrapper div** for parallax:

Revised approach -- create a `ParallaxLayer` component:

```tsx
'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'

interface ParallaxLayerProps {
  children: ReactNode
  className?: string
  /** Speed factor: 0 = static, 1 = normal scroll, < 1 = slower (parallax) */
  speed?: number
}

export function ParallaxLayer({
  children,
  className,
  speed = 0.8,
}: ParallaxLayerProps) {
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, (v) => v * (1 - speed) * -1)

  if (reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  )
}
```

Add this to the same file `components/ui/scroll-reveal.tsx` as a named export.

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 3: Commit**

```
git add components/ui/scroll-reveal.tsx
git commit -m "feat(animation): add ParallaxLayer for scroll-linked depth effects"
```

---

## Phase 2: Transition Choreography

### Task 7: Orchestrate ViewTransition with stagger

**Files:**
- Modify: `components/view-transition.tsx`

**Step 1: Replace simple slide with orchestrated choreography**

Replace the entire `view-transition.tsx` content:

```tsx
'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs, durations } from '@/lib/motion-system'

// =============================================================================
// NAVIGATION DIRECTION
// =============================================================================

type Direction = 'forward' | 'back'

const VIEW_ORDER: Record<string, number> = {
  feed: 0,
  expenses: 1,
  budget: 2,
  goals: 3,
  recurring: 4,
  insights: 5,
  summary: 6,
  calories: 7,
  workouts: 8,
  routines: 9,
  profile: 10,
}

function getDirection(prev: string, next: string): Direction {
  const prevIndex = VIEW_ORDER[prev] ?? 0
  const nextIndex = VIEW_ORDER[next] ?? 0
  return nextIndex >= prevIndex ? 'forward' : 'back'
}

// =============================================================================
// DIRECTION CONTEXT
// =============================================================================

const DirectionContext = createContext<Direction>('forward')
export const useNavigationDirection = () => useContext(DirectionContext)

// =============================================================================
// ORCHESTRATED VARIANTS
// =============================================================================

function getOrchestratedVariants(direction: Direction) {
  const slideOffset = direction === 'forward' ? 60 : -60
  const exitOffset = direction === 'forward' ? -30 : 30

  return {
    container: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: {
          duration: 0.15,
          when: 'beforeChildren',
          staggerChildren: 0.08,
        },
      },
      exit: {
        opacity: 0,
        transition: {
          duration: 0.1,
          when: 'afterChildren',
          staggerChildren: 0.03,
          staggerDirection: -1,
        },
      },
    },
    content: {
      initial: { opacity: 0, x: slideOffset, filter: 'blur(4px)' },
      animate: {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: springs.cinematic,
      },
      exit: {
        opacity: 0,
        x: exitOffset,
        filter: 'blur(2px)',
        transition: { duration: 0.15 },
      },
    },
  }
}

const reducedVariants = {
  container: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  content: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
}

// =============================================================================
// VIEW TRANSITION COMPONENT
// =============================================================================

interface ViewTransitionProps {
  activeView: string
  children: ReactNode
}

export function ViewTransition({ activeView, children }: ViewTransitionProps) {
  const reducedMotion = useReducedMotion()
  const prevView = useRef(activeView)
  const [direction, setDirection] = useState<Direction>('forward')

  useEffect(() => {
    if (prevView.current !== activeView) {
      setDirection(getDirection(prevView.current, activeView))
      prevView.current = activeView
    }
  }, [activeView])

  const v = reducedMotion ? reducedVariants : getOrchestratedVariants(direction)
  const containerTransition = reducedMotion ? { duration: durations.micro } : undefined

  return (
    <DirectionContext.Provider value={direction}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeView}
          variants={v.container}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={containerTransition}
          data-view={activeView}
        >
          <motion.div
            variants={v.content}
            style={{ willChange: 'transform, opacity, filter' }}
          >
            {children}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </DirectionContext.Provider>
  )
}
```

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds. The `springs.cinematic` reference requires Task 1 to be completed first.

**Step 3: Manual verification**

Run: `npm run dev`
- Navigate between views (Feed -> Expenses -> Budget -> back)
- Forward navigation: content should blur-in from right with a soft spring, container fades first
- Back navigation: content should slide out left with quick fade, then new content slides in from left
- Transitions should feel layered and coordinated, not a simple swap

**Step 4: Commit**

```
git add components/view-transition.tsx
git commit -m "feat(animation): orchestrated view transitions with stagger and blur"
```

---

### Task 8: Card expand/morph for ExpandableExpenseCard

**Files:**
- Modify: `components/expandable-expense-card.tsx`

**Step 1: Replace CSS grid animation with Motion layout transitions**

Replace the component content:

```tsx
'use client'

import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { springs, choreography } from '@/lib/motion-system';
import { AnimatePresence, motion } from 'motion/react';
import { forwardRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-motion';
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { CATEGORY_CONFIG, ExpenseCardHeader } from '@/components/expense-card/expense-card-header';
import { ExpenseCardDetails } from '@/components/expense-card/expense-card-details';
import { ExpenseNotesEditor } from '@/components/expense-card/expense-notes-editor';
import { ExpenseCardActions } from '@/components/expense-card/expense-card-actions';
import { DeleteExpenseDialog } from '@/components/expense-card/delete-expense-dialog';

interface ExpandableExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => void;
  onEdit?: (expense: Expense) => void;
  onUpdate?: (expense: Expense) => void;
}

const detailVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
}

export const ExpandableExpenseCard = forwardRef<HTMLDivElement, ExpandableExpenseCardProps>(
  function ExpandableExpenseCard({
    expense,
    onDelete,
    onEdit,
    onUpdate,
  }, ref) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const reducedMotion = useReducedMotion();

  const categoryConfig = (CATEGORY_CONFIG[expense.category || 'Other'] || CATEGORY_CONFIG.Other)!;

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      hapticFeedback('heavy');
      onDelete(expense.id);
    }
    setShowDeleteDialog(false);
  };

  const handleCardClick = () => {
    hapticFeedback('light');
    setIsExpanded(!isExpanded);
  };

  return (
    <SwipeableCard
      onDelete={() => {
        hapticFeedback('heavy')
        if (onDelete) onDelete(expense.id)
      }}
      disabled={isExpanded}
    >
      <motion.div
        ref={ref}
        layout={!reducedMotion}
        transition={springs.ios}
        className="ios-card overflow-hidden relative group"
        data-testid="expense-card"
        animate={isExpanded ? { scale: 1.01 } : { scale: 1 }}
      >
        {/* Category background overlay */}
        <div className={`absolute inset-0 ${categoryConfig.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

        {/* Header */}
        <ExpenseCardHeader
          expense={expense}
          isExpanded={isExpanded}
          onClick={handleCardClick}
        />

        {/* Expanded content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: 'auto',
                opacity: 1,
                transition: {
                  height: { ...springs.ios },
                  opacity: { duration: 0.2, delay: 0.1 },
                },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  opacity: { duration: 0.1 },
                  height: { ...springs.ios, delay: 0.05 },
                },
              }}
              className="overflow-hidden"
            >
              <motion.div
                className="px-4 pb-4 space-y-4"
                variants={{
                  animate: {
                    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
                  },
                  exit: {
                    transition: { staggerChildren: 0.02, staggerDirection: -1 },
                  },
                }}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* Details */}
                <motion.div variants={detailVariants}>
                  <ExpenseCardDetails expense={expense} />
                </motion.div>

                {/* Notes editor */}
                <motion.div variants={detailVariants}>
                  <ExpenseNotesEditor expense={expense} onUpdate={onUpdate} />
                </motion.div>

                {/* Action buttons */}
                <motion.div variants={detailVariants}>
                  <ExpenseCardActions
                    expense={expense}
                    onEdit={onEdit}
                    onDeleteClick={handleDeleteClick}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <DeleteExpenseDialog
          expense={expense}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirmDelete={handleConfirmDelete}
        />
      </motion.div>
    </SwipeableCard>
  );
});

ExpandableExpenseCard.displayName = 'ExpandableExpenseCard';
```

Key changes:
- Card uses `layout` prop for smooth size transitions
- Card subtly scales to 1.01 when expanded (elevation cue)
- Expanded content uses `height: 0 -> auto` with spring (replacing CSS grid)
- Detail sections stagger in (0.06s gaps) and stagger out in reverse
- Exit is fast: opacity first, then height collapses

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 3: Manual verification**

Run: `npm run dev`
- Navigate to Expenses view
- Tap an expense card
- Details should smoothly expand with staggered sub-elements
- Card should subtly scale up when expanded
- Collapse should be snappy: fade out, then shrink

**Step 4: Commit**

```
git add components/expandable-expense-card.tsx
git commit -m "feat(animation): card expand/morph with layout transitions and staggered details"
```

---

### Task 9: Sheet presentation choreography

**Files:**
- Modify: `components/sheet-backdrop-context.tsx`
- Modify: `components/nl-input-sheet.tsx`

**Step 1: Enhance SheetBackdropProvider with smoother depth cue**

In `components/sheet-backdrop-context.tsx`, update the animate values (line 64-67):

Replace:
```typescript
? { scale: 0.94, borderRadius: '10px', filter: 'brightness(0.85)' }
: { scale: 1, borderRadius: '0px', filter: 'brightness(1)' }
```
with:
```typescript
? { scale: 0.96, borderRadius: '16px', filter: 'brightness(0.88) saturate(0.9)' }
: { scale: 1, borderRadius: '0px', filter: 'brightness(1) saturate(1)' }
```

This is a subtle refinement: 0.96 (from 0.94) feels less claustrophobic, 16px radius matches iOS, added desaturation for depth.

**Step 2: Add content stagger to NLInputSheet**

In `components/nl-input-sheet.tsx`, wrap the sheet content sections in stagger containers.

Replace the sheet's `<motion.div>` (line 122-265) inner content with staggered children.

After the drag handle and header, wrap the content area:

Replace:
```tsx
{/* Content */}
<div className="px-4 pb-4">
  <AnimatePresence mode="wait">
```
with:
```tsx
{/* Content - staggers in after sheet settles */}
<motion.div
  className="px-4 pb-4"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.2 } }}
  exit={{ opacity: 0, transition: { duration: 0.05 } }}
>
  <AnimatePresence mode="wait">
```

And close the matching `</div>` → `</motion.div>`.

**Step 3: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 4: Manual verification**

Run: `npm run dev`
- Tap the + button to open the NL Input Sheet
- The background content should scale to 0.96 with rounded corners and slight dimming
- Sheet slides up, then content fades in with a slight delay (feels layered)
- Dismissing: content fades instantly, sheet slides down, background restores

**Step 5: Commit**

```
git add components/sheet-backdrop-context.tsx components/nl-input-sheet.tsx
git commit -m "feat(animation): sheet presentation choreography with refined depth cue"
```

---

## Phase 3: Micro-Polish

### Task 10: 3D card tilt on press

**Files:**
- Create: `components/ui/tilt-card.tsx`

**Step 1: Create TiltCard component**

```tsx
'use client'

import { motion, useMotionValue, useSpring } from 'motion/react'
import { type ReactNode, useCallback } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs } from '@/lib/motion-system'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Max tilt angle in degrees */
  maxTilt?: number
  /** Scale on press */
  pressScale?: number
}

export function TiltCard({
  children,
  className,
  maxTilt = 3,
  pressScale = 0.98,
}: TiltCardProps) {
  const reducedMotion = useReducedMotion()
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const scale = useMotionValue(1)

  const smoothRotateX = useSpring(rotateX, { damping: 20, stiffness: 300 })
  const smoothRotateY = useSpring(rotateY, { damping: 20, stiffness: 300 })
  const smoothScale = useSpring(scale, springs.touch)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5

      rotateX.set(-y * maxTilt * 2)
      rotateY.set(x * maxTilt * 2)
      scale.set(pressScale)
    },
    [reducedMotion, maxTilt, pressScale, rotateX, rotateY, scale]
  )

  const handlePointerUp = useCallback(() => {
    rotateX.set(0)
    rotateY.set(0)
    scale.set(1)
  }, [rotateX, rotateY, scale])

  if (reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      style={{
        perspective: 800,
        rotateX: smoothRotateX,
        rotateY: smoothRotateY,
        scale: smoothScale,
        transformStyle: 'preserve-3d',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </motion.div>
  )
}
```

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 3: Commit**

```
git add components/ui/tilt-card.tsx
git commit -m "feat(animation): add TiltCard with 3D perspective tilt on press"
```

---

### Task 11: Apply TiltCard to feed cards

**Files:**
- Modify: `components/feed/spending-card.tsx`
- Modify: `components/feed/calories-card.tsx` (if it exists and has similar pattern)
- Modify: `components/feed/routine-card.tsx` (if it exists and has similar pattern)

**Step 1: Wrap SpendingCard's root element with TiltCard**

In `components/feed/spending-card.tsx`, add import:
```typescript
import { TiltCard } from '@/components/ui/tilt-card'
```

Wrap the outer `<motion.button>` with `<TiltCard>`:
```tsx
<TiltCard>
  <motion.button
    onClick={onTap}
    whileTap={{ scale: 0.98 }}
    ...
  >
```

Remove the `whileTap={{ scale: 0.98 }}` from the motion.button since TiltCard handles press scaling now.

**Step 2: Apply to calories-card and routine-card**

Check if these files have a similar `<motion.button>` root pattern and apply the same `<TiltCard>` wrapper. Remove their individual `whileTap` scale.

**Step 3: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 4: Manual verification**

Run: `npm run dev`
- Navigate to the feed view
- Press and hold on a spending card
- Card should subtly tilt toward your touch point (3 degrees max)
- Release should spring back to flat
- Effect should be subtle -- not distracting

**Step 5: Commit**

```
git add components/feed/spending-card.tsx components/feed/calories-card.tsx components/feed/routine-card.tsx
git commit -m "feat(animation): apply TiltCard 3D press effect to feed cards"
```

---

### Task 12: Animated skeleton loading with stagger

**Files:**
- Modify: `components/views/feed-view.tsx:31-53` (FeedCardSkeleton)

**Step 1: Replace static skeleton with motion-driven staggered skeleton**

In `feed-view.tsx`, replace the `FeedCardSkeleton` component:

```tsx
function FeedCardSkeleton() {
  return (
    <motion.div
      className="w-full ios-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.cinematic}
    >
      <motion.div
        className="h-0.5 bg-muted"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformOrigin: 'left' }}
      />
      <div className="p-5">
        <motion.div
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.08 } },
          }}
          className="space-y-4"
        >
          {/* Header row */}
          <motion.div
            variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </motion.div>

          {/* Amount */}
          <motion.div variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}>
            <div className="h-3 w-12 rounded bg-muted animate-pulse mb-1" />
            <div className="h-7 w-32 rounded bg-muted animate-pulse" />
          </motion.div>

          {/* Stat boxes */}
          <motion.div
            variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
              <div className="h-3 w-10 rounded bg-muted animate-pulse mb-1" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
            <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
              <div className="h-3 w-10 rounded bg-muted animate-pulse mb-1" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
```

Add `springs` back to the import if it was removed in Task 5.

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 3: Commit**

```
git add components/views/feed-view.tsx
git commit -m "feat(animation): staggered skeleton loading for feed cards"
```

---

### Task 13: AnimatedText component for number/heading reveals

**Files:**
- Create: `components/ui/animated-text.tsx`

**Step 1: Create AnimatedText component**

```tsx
'use client'

import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs } from '@/lib/motion-system'

interface AnimatedTextProps {
  children: string
  className?: string
  /** Split mode: 'words' staggers per word, 'characters' per char */
  by?: 'words' | 'characters'
  /** Stagger delay between units in seconds */
  stagger?: number
  /** Only animate once */
  once?: boolean
}

export function AnimatedText({
  children,
  className,
  by = 'words',
  stagger = 0.04,
  once = true,
}: AnimatedTextProps) {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ triggerOnce: once, threshold: 0.1 })

  const units = useMemo(() => {
    if (by === 'characters') return children.split('')
    return children.split(' ')
  }, [children, by])

  if (reducedMotion) {
    return <span ref={ref} className={className}>{children}</span>
  }

  return (
    <span ref={ref} className={className} style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
      {units.map((unit, i) => (
        <motion.span
          key={`${unit}-${i}`}
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ ...springs.ios, delay: i * stagger }}
          style={{ display: 'inline-block' }}
        >
          {unit}
          {by === 'words' && i < units.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  )
}
```

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 3: Commit**

```
git add components/ui/animated-text.tsx
git commit -m "feat(animation): add AnimatedText with per-word/character staggered reveals"
```

---

### Task 14: Budget milestone pulse animation

**Files:**
- Modify: `components/feed/spending-card.tsx`

**Step 1: Add pulse effect to budget progress bar at milestones**

In `spending-card.tsx`, find the budget progress bar section (lines 154-171). Add a pulse ring when budget usage hits 50%, 75%, or 90%:

After the `<motion.div>` that animates the progress bar width, add:

```tsx
{/* Milestone pulse */}
{(budgetUsedPct >= 50 || budgetUsedPct >= 75 || budgetUsedPct >= 90) && (
  <motion.div
    className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${budgetOverflow ? 'bg-destructive' : 'bg-primary'}`}
    style={{ left: `${Math.min(budgetUsedPct, 100)}%`, marginLeft: -6 }}
    initial={{ scale: 0 }}
    animate={{ scale: [0, 1.5, 1] }}
    transition={{ delay: 1, duration: 0.6, ease: 'easeOut' }}
  >
    <motion.div
      className={`absolute inset-0 rounded-full ${budgetOverflow ? 'bg-destructive' : 'bg-primary'}`}
      animate={{ scale: [1, 2], opacity: [0.4, 0] }}
      transition={{ delay: 1.2, duration: 0.8, repeat: 2 }}
    />
  </motion.div>
)}
```

Make the progress bar container `relative`:
```tsx
<div className="h-1.5 bg-secondary rounded-full overflow-hidden relative">
```

Wait -- `overflow-hidden` will clip the pulse. Change to `overflow-visible` and clip only the bar:

```tsx
<div className="h-1.5 bg-secondary rounded-full relative">
  <div className="absolute inset-0 rounded-full overflow-hidden">
    <motion.div
      className={`h-full rounded-full ${budgetOverflow ? 'bg-destructive' : 'bg-primary'}`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
      transition={{ delay: 0.4, duration: 0.6 }}
    />
  </div>
  {/* Milestone pulse */}
  ...
</div>
```

**Step 2: Verify build passes**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: Build succeeds.

**Step 3: Manual verification**

Run: `npm run dev`
- If budget usage is at 50%+ you should see a small pulsing dot at the current position on the progress bar
- The pulse should animate twice and then settle

**Step 4: Commit**

```
git add components/feed/spending-card.tsx
git commit -m "feat(animation): budget milestone pulse on progress bar"
```

---

### Task 15: Final build verification and cleanup

**Files:**
- All modified files

**Step 1: Full build check**

Run: `npx next build 2>&1`
Expected: Build succeeds with no errors.

**Step 2: Check for unused imports**

Run lint: `npx next lint`
Fix any unused import warnings introduced by the changes.

**Step 3: Delete the old PageHeader component if no longer imported**

Check if `components/page-header.tsx` is still imported anywhere:
```bash
grep -r "page-header" --include="*.tsx" --include="*.ts" .
```

If not imported anywhere, delete it.

**Step 4: Commit cleanup**

```
git add -A
git commit -m "chore(animation): cleanup unused imports and dead code"
```

---

## Summary

| Task | Phase | Component | Description |
|------|-------|-----------|-------------|
| 1 | 1 | motion-system.ts | Add cinematic spring + choreography presets |
| 2 | 1 | scroll-reveal.tsx | Create ScrollReveal component |
| 3 | 1 | collapsing-header.tsx | Create scroll-linked collapsing header |
| 4 | 1 | app/page.tsx | Integrate CollapsingHeader |
| 5 | 1 | feed-view.tsx | Apply ScrollReveal to feed cards |
| 6 | 1 | scroll-reveal.tsx | Add ParallaxLayer |
| 7 | 2 | view-transition.tsx | Orchestrated stagger transitions |
| 8 | 2 | expandable-expense-card.tsx | Card expand/morph with layout |
| 9 | 2 | sheets | Sheet presentation choreography |
| 10 | 3 | tilt-card.tsx | 3D tilt on press |
| 11 | 3 | feed cards | Apply TiltCard to feed |
| 12 | 3 | feed-view.tsx | Staggered skeleton loading |
| 13 | 3 | animated-text.tsx | Per-word/char text reveals |
| 14 | 3 | spending-card.tsx | Budget milestone pulse |
| 15 | - | all | Final build + cleanup |
