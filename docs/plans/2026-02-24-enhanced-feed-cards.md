# Enhanced Feed Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the three feed cards (Spending, Calories, Routine) from plain data displays to visually rich, data-dense mini-dashboards that match the polish of the rest of the app.

**Architecture:** Each card gets: (1) a solid-color accent bar at top, (2) larger icon badges with ring effects, (3) `AnimatedCounter` for hero numbers, (4) new data sections (budget progress bar + top categories for spending, meal count + last meal for calories, routine step checklist for routine), and (5) `bg-muted/40` stat containers with borders. The feed-view orchestrator is updated to pass the new data props by adding `useMeals` and `useRoutineTemplates`+`useRoutineSteps` hooks.

**Tech Stack:** React, Tailwind CSS, Motion (framer-motion), existing `AnimatedCounter` component, existing hooks (`useMeals`, `useRoutineTemplates`, `useRoutineSteps`).

**Constraints:** No gradients. All accent colors are solid fills.

---

### Task 1: Enhance SpendingCard visual treatment and add budget progress bar + top categories

**Files:**
- Modify: `components/feed/spending-card.tsx:1-100`

**Step 1: Update the SpendingCardProps interface**

Add new props for budget and category data. Replace the `SpendingCardProps` interface:

```typescript
interface CategoryBreakdown {
  category: string
  total: number
}

interface SpendingCardProps {
  todayTotal: number
  weekTotal: number
  monthTotal: number
  lastMonthTotal: number
  dailyAllowance: number | null
  budgetTotal: number
  topCategories: CategoryBreakdown[]
  currency: string
  annotation?: string | null
  onTap: () => void
}
```

**Step 2: Update imports**

Add `AnimatedCounter` import after the existing lucide-react import line:

```typescript
import { AnimatedCounter } from '@/components/animated-counter'
```

**Step 3: Rewrite the component JSX**

Replace the entire return block (the function body from computed locals through the closing parenthesis) with the enhanced layout:

```tsx
const monthChange = lastMonthTotal > 0
  ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100)
  : null
const isDown = monthChange !== null && monthChange < 0
const budgetUsedPct = budgetTotal > 0 ? Math.round((monthTotal / budgetTotal) * 100) : null
const budgetOverflow = budgetTotal > 0 && monthTotal > budgetTotal

return (
  <motion.button
    onClick={onTap}
    whileTap={{ scale: 0.98 }}
    transition={springs.ios}
    className="w-full ios-card overflow-hidden text-left"
  >
    {/* Accent bar */}
    <div className="h-0.5 bg-emerald-500" />

    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
          <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Spending</span>
        {monthChange !== null && (
          <div className={`ml-auto flex items-center gap-1 text-xs font-medium ${isDown ? 'text-emerald-600' : 'text-red-500'}`}>
            {isDown ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {Math.abs(monthChange)}%
          </div>
        )}
      </div>

      {/* Hero: today's spend */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Today</p>
        <AnimatedCounter
          value={todayTotal}
          className="text-2xl font-bold tabular-nums"
          prefix={currency === 'VND' ? '' : '$'}
          suffix={currency === 'VND' ? 'đ' : ''}
          locale={CURRENCY_LOCALES[currency] || 'en-US'}
        />
      </div>

      {/* Week + Month stat containers */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Week</p>
          <p className="text-sm font-semibold tabular-nums">{formatAmount(weekTotal, currency)}</p>
        </div>
        <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Month</p>
          <p className="text-sm font-semibold tabular-nums">{formatAmount(monthTotal, currency)}</p>
        </div>
      </div>

      {/* Budget progress bar */}
      {budgetUsedPct !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Budget</p>
            <p className={`text-xs font-medium tabular-nums ${budgetOverflow ? 'text-red-500' : 'text-muted-foreground'}`}>
              {budgetUsedPct}%
            </p>
          </div>
          <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${budgetOverflow ? 'bg-red-500' : 'bg-emerald-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
              transition={springs.ios}
            />
          </div>
          {dailyAllowance !== null && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {dailyAllowance >= 0 ? (
                <>{formatAmount(dailyAllowance, currency)}/day remaining</>
              ) : (
                <span className="text-red-500">Over by {formatAmount(Math.abs(dailyAllowance), currency)}/day</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {topCategories.slice(0, 3).map((cat) => (
            <span key={cat.category} className="tabular-nums">
              <span className="font-medium text-foreground/80">{cat.category || 'Other'}</span>{' '}
              {formatAmount(cat.total, currency)}
            </span>
          ))}
        </div>
      )}

      {/* AI annotation */}
      {annotation && (
        <p className="text-xs text-muted-foreground/80 italic mt-3">{annotation}</p>
      )}
    </div>
  </motion.button>
)
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors in `feed-view.tsx` about missing new props (expected -- wired in Task 4).

**Step 5: Commit**

```bash
git add components/feed/spending-card.tsx
git commit -m "feat(feed): enhance spending card with accent bar, budget progress, and top categories"
```

---

### Task 2: Enhance CaloriesCard with meal count and last meal

**Files:**
- Modify: `components/feed/calories-card.tsx:1-112`

**Step 1: Update CaloriesCardProps interface**

Replace the `CaloriesCardProps` interface:

```typescript
interface CaloriesCardProps {
  caloriesConsumed: number
  calorieGoal: number | null
  waterMl: number
  waterGoalMl: number
  mealCount: number
  lastMealName: string | null
  annotation?: string | null
  onTap: () => void
}
```

**Step 2: Update imports**

Replace the lucide-react import to add `Utensils`:

```typescript
import { Flame, Droplets, Utensils } from 'lucide-react'
```

**Step 3: Update ProgressRing size**

In the `ProgressRing` function signature defaults, change `size = 48` to `size = 52` and `strokeWidth = 4` to `strokeWidth = 5`.

**Step 4: Rewrite the component JSX**

Replace the entire return block of the `CaloriesCard` component:

```tsx
return (
  <motion.button
    onClick={onTap}
    whileTap={{ scale: 0.98 }}
    transition={springs.ios}
    className="w-full ios-card overflow-hidden text-left"
  >
    {/* Accent bar */}
    <div className="h-0.5 bg-orange-500" />

    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
          <Flame className="h-4 w-4 text-orange-500" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Nutrition</span>
      </div>

      {/* Progress rings side by side */}
      <div className="flex items-center gap-6 mb-4">
        {/* Calories */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <ProgressRing progress={calProgress} color="var(--color-orange-500, #f97316)" />
            <Flame className="absolute inset-0 m-auto h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{Math.round(caloriesConsumed)}</p>
            <p className="text-xs text-muted-foreground">
              / {calorieGoal ?? '---'} cal
            </p>
          </div>
        </div>

        {/* Water */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <ProgressRing progress={waterProgress} color="var(--color-blue-500, #3b82f6)" />
            <Droplets className="absolute inset-0 m-auto h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{(waterMl / 1000).toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground">
              / {(waterGoalMl / 1000).toFixed(1)}L water
            </p>
          </div>
        </div>
      </div>

      {/* Meal summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 dark:bg-muted/20 rounded-xl px-3 py-2.5 border border-border/50">
        <Utensils className="h-3.5 w-3.5 shrink-0" />
        {mealCount > 0 ? (
          <span>
            <span className="font-medium text-foreground/80">{mealCount} meal{mealCount !== 1 ? 's' : ''}</span>
            {lastMealName && <> — last: {lastMealName}</>}
          </span>
        ) : (
          <span>No meals logged yet</span>
        )}
      </div>

      {/* AI annotation */}
      {annotation && (
        <p className="text-xs text-muted-foreground/80 italic mt-3">{annotation}</p>
      )}
    </div>
  </motion.button>
)
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors in `feed-view.tsx` about missing new props (expected -- wired in Task 4).

**Step 6: Commit**

```bash
git add components/feed/calories-card.tsx
git commit -m "feat(feed): enhance calories card with accent bar, larger rings, and meal summary"
```

---

### Task 3: Enhance RoutineCard with step checklist preview

**Files:**
- Modify: `components/feed/routine-card.tsx:1-69`

**Step 1: Update RoutineCardProps interface**

Replace the `RoutineCardProps` interface:

```typescript
interface RoutineStep {
  name: string
  completed: boolean
}

interface RoutineCardProps {
  completedToday: boolean
  currentStreak: number
  totalXp: number
  level: number
  steps: RoutineStep[]
  annotation?: string | null
  onTap: () => void
}
```

**Step 2: Update imports**

Replace the lucide-react import to add `Check` and `Circle`:

```typescript
import { Sparkles, Zap, Flame as StreakIcon, Check, Circle } from 'lucide-react'
```

**Step 3: Rewrite the component JSX**

Replace the entire return block of the `RoutineCard` component:

```tsx
return (
  <motion.button
    onClick={onTap}
    whileTap={{ scale: 0.98 }}
    transition={springs.ios}
    className="w-full ios-card overflow-hidden text-left"
  >
    {/* Accent bar */}
    <div className="h-0.5 bg-teal-500" />

    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
          <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Routines</span>
        {completedToday && (
          <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            Done
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/50 flex items-center gap-2">
          <StreakIcon className="h-4 w-4 text-orange-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold tabular-nums">{currentStreak} day streak</p>
          </div>
        </div>
        <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/50 flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold tabular-nums">Lv.{level} <span className="font-normal text-muted-foreground text-xs">{totalXp} XP</span></p>
          </div>
        </div>
      </div>

      {/* Step checklist preview */}
      {steps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Today</p>
          {steps.slice(0, 4).map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {step.completed ? (
                <div className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={step.completed ? 'text-muted-foreground line-through' : 'text-foreground/80'}>
                {step.name}
              </span>
            </div>
          ))}
          {steps.length > 4 && (
            <p className="text-[10px] text-muted-foreground pl-6">+{steps.length - 4} more</p>
          )}
        </div>
      )}

      {/* AI annotation */}
      {annotation && (
        <p className="text-xs text-muted-foreground/80 italic mt-3">{annotation}</p>
      )}
    </div>
  </motion.button>
)
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors in `feed-view.tsx` about missing new props (expected -- wired in Task 4).

**Step 5: Commit**

```bash
git add components/feed/routine-card.tsx
git commit -m "feat(feed): enhance routine card with accent bar, stat containers, and step checklist"
```

---

### Task 4: Update FeedView to pass new data to enhanced cards

**Files:**
- Modify: `components/views/feed-view.tsx:1-192`

**Step 1: Add new hook imports**

Update the `@/lib/hooks` import block to add `useMeals`, `useRoutineTemplates`, and `useRoutineSteps`:

```typescript
import {
  useExpenses,
  useBudgets,
  useMeals,
  useCalorieStats,
  useCalorieGoal,
  useWaterLog,
  useRoutineStreak,
  useRoutineStats,
  useRoutines,
  useRoutineTemplates,
  useRoutineSteps,
  useProfile,
  useFeedAnnotations,
} from '@/lib/hooks'
```

**Step 2: Compute top categories in the existing expense useMemo (single pass)**

The existing `useMemo` already iterates all expenses to compute today/week/month/lastMonth totals. Add category tracking to the same loop to avoid a second pass. Replace the existing expense `useMemo` block:

```typescript
const { todayTotal, weekTotal, monthTotal, lastMonthTotal, topCategories } = useMemo(() => {
  const now = new Date()
  const todayDate = now.toDateString()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999)

  let today = 0, week = 0, month = 0, lastMonth = 0
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    const d = new Date(e.transaction_date)
    if (d.toDateString() === todayDate) today += e.amount
    if (d >= weekStart) week += e.amount
    if (d >= monthStart) {
      month += e.amount
      const cat = e.category || 'Other'
      byCategory[cat] = (byCategory[cat] || 0) + e.amount
    }
    if (d >= prevMonthStart && d <= prevMonthSameDay) lastMonth += e.amount
  }

  const categories = Object.entries(byCategory)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  return { todayTotal: today, weekTotal: week, monthTotal: month, lastMonthTotal: lastMonth, topCategories: categories }
}, [expenses])
```

**Step 3: Add useMeals hook for meal summary**

After the water data hooks (after `useWaterLog`), add:

```typescript
const { data: todayMeals = [], isLoading: mealsLoading } = useMeals(
  { startDate: todayStr, endDate: todayStr },
  { enabled: !caloriesLoading }
)
const mealCount = todayMeals.length
const lastMealName = todayMeals.length > 0
  ? [...todayMeals].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0].name
  : null
```

**Step 4: Add routine template + steps hooks for checklist**

After the `completedToday` line, add:

```typescript
const { data: templateData, isLoading: templatesLoading } = useRoutineTemplates()
const { data: stepsData } = useRoutineSteps()

const routineSteps = useMemo(() => {
  const completions = routineData?.completions ?? []
  const completedSteps = completions.flatMap(c => c.steps_completed ?? [])

  // if there are completions, use their step data
  if (completedSteps.length > 0) {
    return completedSteps.map(s => ({
      name: s.step_name,
      completed: !s.skipped,
    }))
  }

  // no completions yet -- preview the first template's steps as unchecked
  // (first template is the most recently created / primary routine)
  const templates = templateData?.templates ?? []
  const builtinSteps = stepsData?.steps ?? []
  const customSteps = stepsData?.customSteps ?? []
  if (templates.length === 0) return []

  const template = templates[0]
  const stepMap = new Map([...builtinSteps, ...customSteps].map(s => [s.id, s.name]))
  return template.steps
    .sort((a, b) => a.order - b.order)
    .map(ref => ({
      name: stepMap.get(ref.step_id) ?? 'Unknown step',
      completed: false,
    }))
}, [routineData, templateData, stepsData])
```

**Step 4b: Include new loading states in the skeleton guard**

Update the existing `isLoading` check that controls whether skeletons or cards are rendered. Find the loading guard (the condition that renders `FeedCardSkeleton` components) and add the new hook loading states:

```typescript
const isLoading = expensesLoading || caloriesLoading || routineLoading || mealsLoading || templatesLoading
```

Use this `isLoading` variable in the existing skeleton conditional instead of checking individual loading flags inline.

**Step 5: Update SpendingCard props**

In the `SpendingCard` JSX, replace props to include budget and categories:

```tsx
<SpendingCard
  todayTotal={todayTotal}
  weekTotal={weekTotal}
  monthTotal={monthTotal}
  lastMonthTotal={lastMonthTotal}
  dailyAllowance={dailyAllowance}
  budgetTotal={totalBudget}
  topCategories={topCategories}
  currency={currency}
  annotation={annotations?.spending}
  onTap={() => onNavigate('expenses')}
/>
```

**Step 6: Update CaloriesCard props**

In the `CaloriesCard` JSX, replace props to include meal data:

```tsx
<CaloriesCard
  caloriesConsumed={todayCalories}
  calorieGoal={calGoal}
  waterMl={waterMl}
  waterGoalMl={waterGoalMl}
  mealCount={mealCount}
  lastMealName={lastMealName}
  annotation={annotations?.calories}
  onTap={() => onNavigate('calories')}
/>
```

**Step 7: Update RoutineCard props**

In the `RoutineCard` JSX, replace props to include steps:

```tsx
<RoutineCard
  completedToday={completedToday}
  currentStreak={streakData?.streak?.current_streak ?? 0}
  totalXp={statsData?.stats?.total_xp ?? 0}
  level={statsData?.stats?.current_level ?? 1}
  steps={routineSteps}
  annotation={annotations?.routine}
  onTap={() => onNavigate('routines')}
/>
```

**Step 8: Update FeedCardSkeleton to match new sizing**

Replace the `FeedCardSkeleton` component:

```tsx
function FeedCardSkeleton() {
  return (
    <div className="w-full ios-card overflow-hidden animate-pulse">
      <div className="h-0.5 bg-muted" />
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-full bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
        <div className="h-3 w-12 rounded bg-muted mb-1" />
        <div className="h-7 w-32 rounded bg-muted mb-4" />
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
            <div className="h-3 w-10 rounded bg-muted mb-1" /><div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
            <div className="h-3 w-10 rounded bg-muted mb-1" /><div className="h-4 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new type errors.

**Step 10: Commit**

```bash
git add components/views/feed-view.tsx
git commit -m "feat(feed): wire enhanced card props with meals, categories, and routine steps"
```

---

### Task 5: Visual verification and polish

**Step 1: Run the dev server**

Run: `npm run dev`
Open: `http://localhost:3000`

Verify:
- All three cards show the solid accent bar at top (emerald, orange, teal)
- Spending card shows hero today amount with AnimatedCounter, week/month stat containers, budget progress bar, top 3 categories
- Calories card shows larger progress rings, meal count with last meal name
- Routine card shows stat containers for streak/level, checklist preview of steps
- All cards have `p-5` padding and `ring-1` on icon badges
- Dark mode renders correctly (check accent bars, stat container backgrounds, ring colors)
- Cards still navigate to correct views on tap
- Loading skeletons match new card structure

**Step 2: Run TypeScript check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors.

**Step 3: Commit any fixes**

```bash
git add components/feed/ components/views/feed-view.tsx
git commit -m "feat(feed): polish enhanced feed cards"
```
