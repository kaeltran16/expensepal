# Home Page Redesign — Expense-First with Compact Widgets

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current "dashboard of dashboards" home page with an expense-focused layout that matches the visual language of the inner views (Expenses, Insights, Routines), adding a compact widget row for secondary features and a recent transactions list.

**Architecture:** Rewrite `feed-view.tsx` to render: (1) a spending hero card (simplified from current `SpendingCard`), (2) a compact widget row for nutrition/routine at-a-glance, (3) a "Recent Transactions" section reusing `ExpandableExpenseCard`. Remove the three separate full-height feed cards (`SpendingCard`, `CaloriesCard`, `RoutineCard`). FeedView stays self-contained — it fetches its own data via existing hooks and uses `useExpenseOperations` internally for delete/update. The only new prop is `onEdit` (from `page.tsx`, since the edit form sheet lives there). No backend or API changes.

**Tech Stack:** React 18, Motion (Framer Motion v12), Tailwind CSS, TanStack Query, existing `motion-system.ts` springs/variants.

---

## Task 1: Create Compact Widget Components

**Files:**
- Create: `components/feed/compact-widget.tsx`

**Step 1: Create the compact widget component**

This is a small, tappable card that shows a single stat with an icon — used for nutrition and routines on the home page. It should match the `ios-card` style used everywhere else (no colored left borders, no accent bar).

```tsx
'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import type { LucideIcon } from 'lucide-react'

interface CompactWidgetProps {
  icon: LucideIcon
  iconColor: string
  iconBg: string
  label: string
  value: string
  subtitle?: string
  onTap: () => void
}

export function CompactWidget({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  subtitle,
  onTap,
}: CompactWidgetProps) {
  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.97 }}
      transition={springs.touch}
      className="flex-1 ios-card p-3.5 text-left"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-bold tracking-tight tabular-nums">{value}</p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </motion.button>
  )
}
```

**Step 2: Verify it builds**

Run: `npx next build --no-lint 2>&1 | head -20` or check the dev server has no errors.
Expected: No TypeScript errors for the new file.

**Step 3: Commit**

```bash
git add components/feed/compact-widget.tsx
git commit -m "feat(feed): add CompactWidget component for home page widget row"
```

---

## Task 2: Create Spending Hero Card

**Files:**
- Create: `components/feed/spending-hero.tsx`

**Step 1: Create the spending hero component**

This replaces the full `SpendingCard` on the home page. It's simpler — just the hero amount, week/month stats, and optional budget bar. No AI annotations, no trend footer, no TiltCard wrapper. Matches the card style used in `expenses-view` (plain `ios-card`, no colored accent bar).

```tsx
'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Wallet, Activity } from 'lucide-react'
import { AnimatedCounter } from '@/components/animated-counter'

interface SpendingHeroProps {
  todayTotal: number
  weekTotal: number
  monthTotal: number
  budgetTotal: number
  currency: string
  onTap: () => void
}

const CURRENCY_LOCALES: Record<string, string> = {
  VND: 'vi-VN',
  USD: 'en-US',
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SpendingHero({
  todayTotal,
  weekTotal,
  monthTotal,
  budgetTotal,
  currency,
  onTap,
}: SpendingHeroProps) {
  const symbol = currency === 'VND' ? '' : '$'
  const suffix = currency === 'VND' ? 'đ' : ''
  const budgetUsedPct = budgetTotal > 0 ? Math.round((monthTotal / budgetTotal) * 100) : null
  const budgetOverflow = budgetTotal > 0 && monthTotal > budgetTotal

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.touch}
      className="w-full ios-card overflow-hidden text-left"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Today</p>
            <p className="text-3xl font-black tracking-tight leading-none">
              <span className="text-lg font-bold text-muted-foreground mr-0.5">{symbol}</span>
              <AnimatedCounter
                value={todayTotal}
                duration={1200}
                locale={CURRENCY_LOCALES[currency] ?? 'en-US'}
              />
              {suffix && <span className="text-lg font-bold text-muted-foreground ml-0.5">{suffix}</span>}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Week + Month */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="h-3 w-3 text-primary" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Week</p>
            </div>
            <p className="text-base font-bold tracking-tight tabular-nums">{formatAmount(weekTotal, currency)}</p>
          </div>
          <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="h-3 w-3 text-accent" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Month</p>
            </div>
            <p className="text-base font-bold tracking-tight tabular-nums">{formatAmount(monthTotal, currency)}</p>
          </div>
        </div>

        {/* Budget bar */}
        {budgetUsedPct !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Budget</p>
              <p className={`text-[10px] font-medium tabular-nums ${budgetOverflow ? 'text-destructive' : 'text-muted-foreground'}`}>
                {budgetUsedPct}%
              </p>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${budgetOverflow ? 'bg-destructive' : 'bg-primary'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                transition={{ delay: 0.3, duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.button>
  )
}
```

**Step 2: Verify it builds**

Run: check dev server for TypeScript errors.
Expected: Clean compile.

**Step 3: Commit**

```bash
git add components/feed/spending-hero.tsx
git commit -m "feat(feed): add SpendingHero component for home page"
```

---

## Task 3: Create Recent Transactions Section

**Files:**
- Create: `components/feed/recent-transactions.tsx`

**Step 1: Create the recent transactions component**

This renders the last 5 expenses on the home page, reusing the existing `ExpandableExpenseCard`. It includes a date group header and a "See All" button that navigates to the expenses view.

```tsx
'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { springs, variants, getStaggerDelay } from '@/lib/motion-system'
import { ExpandableExpenseCard } from '@/components/expandable-expense-card'
import type { Expense } from '@/lib/supabase'

interface RecentTransactionsProps {
  expenses: Expense[]
  onDelete: (id: string) => void
  onEdit: (expense: Expense) => void
  onUpdate: (expense: Expense) => void
  onSeeAll: () => void
}

function getDateGroupLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return target.toLocaleDateString('en-US', { weekday: 'long' })
}

type ListItem =
  | { type: 'header'; label: string; key: string }
  | { type: 'expense'; expense: Expense }

export function RecentTransactions({
  expenses,
  onDelete,
  onEdit,
  onUpdate,
  onSeeAll,
}: RecentTransactionsProps) {
  const recent = useMemo(() => expenses.slice(0, 5), [expenses])

  const groupedItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = []
    let lastLabel = ''
    for (const expense of recent) {
      const label = getDateGroupLabel(new Date(expense.transaction_date))
      if (label !== lastLabel) {
        items.push({ type: 'header', label, key: `header-${label}` })
        lastLabel = label
      }
      items.push({ type: 'expense', expense })
    }
    return items
  }, [recent])

  if (recent.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="ios-headline">Recent Transactions</h2>
        <button
          onClick={onSeeAll}
          className="text-xs font-medium text-primary"
        >
          See All
        </button>
      </div>

      <div className="space-y-2">
        {groupedItems.map((item, index) =>
          item.type === 'header' ? (
            <motion.div
              key={item.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: getStaggerDelay(index) }}
            >
              <div className="flex items-center gap-3 py-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {item.label}
                </p>
                <div className="h-px flex-1 bg-border/50" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={item.expense.id}
              {...variants.slideUp}
              transition={{
                ...springs.ios,
                delay: getStaggerDelay(index),
              }}
            >
              <ExpandableExpenseCard
                expense={item.expense}
                onDelete={onDelete}
                onEdit={onEdit}
                onUpdate={onUpdate}
              />
            </motion.div>
          )
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify it builds**

Run: check dev server for TypeScript errors.
Expected: Clean compile.

**Step 3: Commit**

```bash
git add components/feed/recent-transactions.tsx
git commit -m "feat(feed): add RecentTransactions component for home page"
```

---

## Task 4: Rewrite FeedView with New Layout

**Files:**
- Modify: `components/views/feed-view.tsx` (full rewrite)
- Modify: `app/page.tsx` (pass `onEdit` prop to FeedView, ~line 554)

**Step 1: Rewrite feed-view.tsx**

Replace the current implementation with the new layout: spending hero + widget row + recent transactions. FeedView stays self-contained — it uses internal hooks for all data and `useExpenseOperations` for delete/update handlers. The only new prop is `onEdit` (passed from `page.tsx` since the edit form sheet lives there).

Update the `FeedViewProps` interface:

```tsx
interface FeedViewProps {
  onNavigate: (view: ViewType) => void
  onEdit: (expense: Expense) => void
}
```

Add `useExpenseOperations` to the hook imports and use it inside the component:

```tsx
const { handleDelete, handleUpdateNotes } = useExpenseOperations(expenses)
```

Update `FeedCardSkeleton` in the same file to match the new SpendingHero shape (no separate task — skeleton must match layout in the same commit):

```tsx
function FeedCardSkeleton() {
  return (
    <div className="w-full ios-card overflow-hidden">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="h-3 w-10 rounded bg-muted animate-pulse mb-2" />
            <div className="h-7 w-28 rounded bg-muted animate-pulse" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
        </div>
        {/* Stat boxes */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
            <div className="h-3 w-10 rounded bg-muted animate-pulse mb-1.5" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          </div>
          <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
            <div className="h-3 w-10 rounded bg-muted animate-pulse mb-1.5" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

Rewrite the component body to render:

```tsx
return (
  <div className="space-y-5">
    {/* Spending hero */}
    <ScrollReveal delay={0}>
      {isLoading ? (
        <FeedCardSkeleton />
      ) : (
        <SpendingHero
          todayTotal={todayTotal}
          weekTotal={weekTotal}
          monthTotal={monthTotal}
          budgetTotal={totalBudget}
          currency={currency}
          onTap={() => onNavigate('expenses')}
        />
      )}
    </ScrollReveal>

    {/* Compact widget row */}
    <ScrollReveal delay={0.06}>
      {isLoading ? (
        <div className="flex gap-2.5">
          <div className="flex-1 ios-card p-3.5 space-y-2">
            <div className="h-3 w-14 rounded bg-muted animate-pulse" />
            <div className="h-5 w-10 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex-1 ios-card p-3.5 space-y-2">
            <div className="h-3 w-14 rounded bg-muted animate-pulse" />
            <div className="h-5 w-10 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="flex gap-2.5">
          <CompactWidget
            icon={Flame}
            iconColor="text-accent"
            iconBg="bg-accent/10"
            label="Calories"
            value={`${Math.round(todayCalories)}`}
            subtitle={calGoal ? `/ ${calGoal} cal` : undefined}
            onTap={() => onNavigate('calories')}
          />
          <CompactWidget
            icon={Sparkles}
            iconColor="text-success"
            iconBg="bg-success/10"
            label="Routine"
            value={completedToday ? 'Done' : `${completedCount}/${totalSteps}`}
            subtitle={`${streakData?.streak?.current_streak ?? 0} day streak`}
            onTap={() => onNavigate('routines')}
          />
        </div>
      )}
    </ScrollReveal>

    {/* Recent transactions */}
    <ScrollReveal delay={0.12}>
      {!isLoading && (
        <RecentTransactions
          expenses={expenses}
          onDelete={handleDelete}
          onEdit={onEdit}
          onUpdate={handleUpdateNotes}
          onSeeAll={() => onNavigate('expenses')}
        />
      )}
    </ScrollReveal>
  </div>
)
```

Remove these imports/hooks that are no longer needed:
- `SpendingCard`, `CaloriesCard`, `RoutineCard` imports
- `useFeedAnnotations` hook (AI annotations)
- `useMeals` hook (meal count / last meal name only needed for the old CaloriesCard footer)
- `useRoutineTemplates`, `useRoutineSteps` hooks (step checklist only needed for old RoutineCard)
- `useWaterLog` hook (water data no longer shown on home)

Keep these hooks (still needed):
- `useExpenses` — for spending totals AND recent transactions list
- `useExpenseOperations` — **new import**, for `handleDelete` and `handleUpdateNotes`
- `useBudgets` — for budget bar
- `useProfile` — for currency
- `useCalorieStats`, `useCalorieGoal` — for compact widget value
- `useRoutineStreak`, `useRoutineStats` — for compact widget value
- `useRoutines` — for completedToday

**Step 2: Pass `onEdit` prop from page.tsx**

Find the `FeedView` render in `app/page.tsx` (around line 554):

```tsx
// BEFORE:
<FeedView onNavigate={setActiveView} />

// AFTER:
<FeedView onNavigate={setActiveView} onEdit={handleEdit} />
```

`handleEdit` (defined at `page.tsx:333`) is already in scope — it calls `setEditingExpense` + `setShowForm` to open the expense form sheet.

**Step 3: Verify end-to-end**

Run: open `http://localhost:3000` in browser.
Expected:
- Home shows spending hero card with today's amount, week/month stats
- Two compact widgets: Calories and Routine (with loading skeletons while data loads)
- Recent transactions with expandable cards (tap to expand, swipe to delete)
- Tapping "See All" navigates to expenses view
- Tapping either widget navigates to its respective view
- Skeleton matches SpendingHero shape during loading

**Step 4: Commit**

```bash
git add components/views/feed-view.tsx app/page.tsx
git commit -m "feat(feed): rewrite home page with expense-first layout"
```

---

## Task 5: Clean Up Old Feed Card Components

**Files:**
- Delete: `components/feed/spending-card.tsx`
- Delete: `components/feed/calories-card.tsx`
- Delete: `components/feed/routine-card.tsx`

**Step 1: Verify no other imports reference these files**

Search for imports of `spending-card`, `calories-card`, `routine-card` across the codebase. After Task 4, `feed-view.tsx` should no longer import them. If any other file imports them, update those imports first.

Run: `grep -r "spending-card\|calories-card\|routine-card" --include="*.tsx" --include="*.ts" -l`
Expected: No results (or only the files themselves).

**Step 2: Delete the old card files**

```bash
rm components/feed/spending-card.tsx
rm components/feed/calories-card.tsx
rm components/feed/routine-card.tsx
```

**Step 3: Verify build**

Run: check dev server has no import errors.
Expected: Clean compile, no broken imports.

**Step 4: Commit**

```bash
git add -u components/feed/
git commit -m "refactor(feed): remove old full-size feed cards"
```

---

## Notes

- **No backend changes.** All data hooks remain the same — we're only reshaping the UI.
- **No routing changes.** The `activeView` state machine in `page.tsx` is unchanged.
- **No animation system changes.** We use existing springs/variants from `motion-system.ts`.
- **FeedView stays self-contained.** It fetches its own data via hooks and uses `useExpenseOperations` internally. The only prop added is `onEdit` (since the form sheet lives in `page.tsx`). No expense data is prop-drilled from the parent.
- **Old cards are not imported elsewhere.** They were only used in `feed-view.tsx`. Safe to delete after Task 4.
- **The `ExpandableExpenseCard` already handles** swipe-to-delete, tap-to-expand, and edit actions. We're just rendering it in a new context.
- **`useFeedAnnotations`** (the AI text blurbs) can be dropped from `feed-view.tsx` — the annotation text added visual noise and is not present in the inner views. If the user wants annotations back later, the hook still exists.
