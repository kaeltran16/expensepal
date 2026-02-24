# Cinematic Animation Overhaul

Full cinematic animation redesign for ExpensePal, implemented in 3 incremental phases. Each phase delivers standalone value.

**Direction:** Polished and cinematic -- smooth parallax, layered depth, elegant reveals, coordinated transitions. Think Apple apps, Linear.

**Foundation:** Builds on existing motion-system.ts (iOS-tuned springs, tiered durations, reduced-motion support).

---

## Phase 1: Scroll-Driven Depth

### 1A. Parallax Collapsing Header

Replace the current boolean scroll toggle (app/page.tsx:330-355) with a continuous scroll-linked header.

- 0-120px scroll: header compresses from ~180px to ~64px
- Greeting text scales down and fades, date slides up
- Background gains intensifying frosted blur (backdrop-filter: blur(20px))
- Use `useScroll()` from Motion targeting the content scroll container
- Map `scrollYProgress` to height, opacity, blur, scale via `useTransform`
- New component: `components/collapsing-header.tsx`

### 1B. Viewport-Triggered Staggered Reveals

Extend the AnimatedCounter viewport pattern to all major content:

- **Feed cards:** slide up from y: 40, opacity: 0 on viewport entry, 80ms stagger between cards
- **Expense list items:** fade in with y: 12 shift on virtual row mount (TanStack Virtual)
- **Stats/numbers:** progress bars and counters animate fill/count only when visible
- New reusable component: `ScrollReveal` wrapper using `useInView`

### 1C. Scroll-Linked Depth Layering

Subtle parallax between content layers:

- Background elements (section headers, accents) move at 0.8x scroll speed
- Foreground cards move at 1x (normal)
- Use `useTransform(scrollY, ...)` on wrapper elements

---

## Phase 2: Transition Choreography

### 2A. Orchestrated View Transitions

Replace the simple slide in ViewTransition with coordinated multi-element choreography:

- **Forward:** background cross-fades (150ms), header slides in (spring), content staggers up (80ms gaps). ~400ms total.
- **Back:** content fades (100ms), header slides out, background cross-fades. Faster exit.
- Use `variants` with `staggerChildren` and `delayChildren` on parent motion.div

### 2B. Card Expand/Morph Transitions

Replace CSS grid height animation in ExpandableExpenseCard:

- **Tap:** card scales up (1.02), shadow elevates, morphs to wider layout
- **Expanded:** detail rows stagger in (slideUp, 60ms apart)
- **Collapse:** details fade out fast, card shrinks back with spring
- Use Motion's `layout` prop for smooth size transitions, `AnimatePresence` for content

### 2C. Sheet Presentation Choreography

Add layered presentation to bottom sheets (NLInputSheet, FilterSheet):

- **Open:** background dims (200ms), sheet slides up with spring overshoot, content staggers in (50ms)
- **Close:** content fades instant, sheet slides down (faster spring), background clears
- **Depth cue:** main content scales to 0.96 and rounds corners when sheet is open (iOS pattern)

---

## Phase 3: Micro-Polish

### 3A. 3D Card Tilt on Press

Subtle perspective tilt based on touch position:

- Calculate touch point on card, tilt up to 3deg on X/Y axes
- Scale down to 0.98 on press, spring back on release
- `perspective(800px)` with `rotateX`/`rotateY`
- Integrate into Pressable or new TiltCard wrapper

### 3B. Animated Skeleton Loading States

Replace CSS pulse shimmer with Motion-driven skeletons:

- Skeleton shapes fade in with stagger matching real content layout
- Shimmer gradient sweep (enhance existing CSS with motion values)
- Skeleton morphs into real content via shared layout transition (not abrupt swap)
- Apply to: feed cards, expense list, stats sections

### 3C. Text & Number Reveals

Character/word-level animations for key content:

- **Spending totals:** digits animate in individually with Y offset stagger (slot machine effect)
- **Section headings:** text clips in from bottom with per-word stagger
- New thin component: `AnimatedText`

### 3D. Completion & State Celebrations

Enhance existing confetti/feedback with more moments:

- **Budget milestones:** pulse radiates from progress bar at 50%/75%/90%
- **Streak maintenance:** shimmer across streak counter on daily log
- **Empty state:** illustration fades in with gentle bounce on last item deletion

---

## Technical Notes

- All animations respect `prefers-reduced-motion` (existing pattern in motion-system.ts)
- Performance: scroll-linked effects need `will-change` hints and passive listeners for 60fps on mobile Safari
- Motion library's `useScroll`, `useTransform`, `useInView` provide the primitives for Phase 1
- `layout` prop and `layoutId` provide the primitives for Phase 2
- Phase 3 components are self-contained and can be applied incrementally

## Files Impacted

- `lib/motion-system.ts` -- add new spring presets, choreography variants
- `hooks/use-motion.ts` -- add scroll-linked hooks
- `components/collapsing-header.tsx` -- new (Phase 1A)
- `components/ui/scroll-reveal.tsx` -- new (Phase 1B)
- `components/view-transition.tsx` -- modify (Phase 2A)
- `components/expandable-expense-card.tsx` -- modify (Phase 2B)
- `components/ui/pressable.tsx` -- modify (Phase 3A)
- `components/animated-counter.tsx` -- modify (Phase 3C)
- `app/page.tsx` -- modify header scroll logic (Phase 1A)
- `components/views/feed-view.tsx` -- modify card entrance (Phase 1B)
