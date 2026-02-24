# Personalized "Today" Home Feed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the default Expenses view with a personalized "Today" feed showing 3 AI-annotated cards (Spending, Calories+Water, Routine) and restructure the bottom navigation.

**Architecture:** New `feed` view type added to the existing SPA. Three card components consume existing data hooks and display live data. A new AI API route generates per-card annotations in a single batch call, cached via React Query. Bottom nav updated: Home replaces Expenses, Routines replaces Insights (Insights+Expenses move to More sheet).

**Tech Stack:** Next.js 14 (App Router), React Query, Motion animations, Supabase, OpenRouter LLM, existing hook infrastructure.

---

### Task 1: Add `feed` view type to constants and page header

**Files:**
- Modify: `lib/constants/filters.ts:19-26`
- Modify: `components/page-header.tsx:11-22`
- Modify: `components/view-transition.tsx:25-36`

**Step 1: Update ViewType and VIEW_ORDER**

In `lib/constants/filters.ts`, add `'feed'` to the `ViewType` union:

```typescript
export type ViewType = 'feed' | 'expenses' | 'budget' | 'goals' | 'summary' | 'insights' | 'calories' | 'recurring' | 'workouts' | 'profile' | 'routines';
```

**Step 2: Add feed title to page header**

In `components/page-header.tsx`, add `feed` entry to `VIEW_TITLES`:

```typescript
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
};
```

**Step 3: Add feed to VIEW_ORDER in view-transition.tsx**

In `components/view-transition.tsx`, add `feed` at index 0 and shift all existing entries up by 1. This controls slide animation direction -- without it, navigating back to feed plays the wrong animation.

```typescript
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
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors (existing errors are OK if they were there before).

**Step 5: Commit**

```bash
git add lib/constants/filters.ts components/page-header.tsx components/view-transition.tsx
git commit -m "feat(feed): add feed view type to constants, page header, and view transitions"
```

---

### Task 2: Update bottom navigation

**Files:**
- Modify: `components/bottom-navigation.tsx:1-35`

**Step 1: Update nav items and imports**

Replace the icon imports and nav item arrays. Change `Wallet` to `Home` (from lucide-react), replace `Lightbulb` with `Sparkles`, and update the arrays:

```typescript
import { Dumbbell, Home, MoreHorizontal, Plus, Sparkles } from 'lucide-react'
```

Update the nav item arrays:

```typescript
const LEFT_NAV_ITEMS: NavItem[] = [
  { id: 'feed', label: 'Home', icon: Home },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
]

const RIGHT_NAV_ITEMS: NavItem[] = [
  { id: 'routines', label: 'Routines', icon: Sparkles },
  { id: 'more', label: 'More', icon: MoreHorizontal },
]
```

**Step 2: Update MORE_VIEWS to include expenses and insights**

```typescript
const MORE_VIEWS: ViewType[] = ['expenses', 'insights', 'calories', 'budget', 'goals', 'recurring', 'summary', 'profile']
```

**Step 3: Verify the component renders**

Run: `npm run dev` and check the bottom nav shows Home | Workouts | [+] | Routines | More.

**Step 4: Commit**

```bash
git add components/bottom-navigation.tsx
git commit -m "feat(nav): update bottom nav to Home, Workouts, Routines, More"
```

---

### Task 3: Update More sheet with Expenses, Insights, Goals, and Summary

**Files:**
- Modify: `components/more-sheet.tsx:18-24`

**Step 1: Add Expenses, Insights, Goals, and Summary to MORE_ITEMS**

Add new entries to the `MORE_ITEMS` array. Import additional icons:

```typescript
import { Flame, Target, Repeat, User, ChevronRight, X, Wallet, Lightbulb, PiggyBank, BarChart3 } from 'lucide-react'
```

Update the array:

```typescript
const MORE_ITEMS = [
  { id: 'expenses' as const, label: 'Expenses', description: 'Track spending & transactions', icon: Wallet, color: 'text-emerald-500' },
  { id: 'insights' as const, label: 'Insights', description: 'Analytics & spending patterns', icon: Lightbulb, color: 'text-yellow-500' },
  { id: 'calories' as const, label: 'Calories', description: 'Track meals & nutrition', icon: Flame, color: 'text-orange-500' },
  { id: 'budget' as const, label: 'Budget', description: 'Manage spending limits', icon: Target, color: 'text-blue-500' },
  { id: 'goals' as const, label: 'Goals', description: 'Savings goals & progress', icon: PiggyBank, color: 'text-pink-500' },
  { id: 'recurring' as const, label: 'Recurring', description: 'Subscriptions & bills', icon: Repeat, color: 'text-green-500' },
  { id: 'summary' as const, label: 'Summary', description: 'Weekly & monthly overview', icon: BarChart3, color: 'text-indigo-500' },
  { id: 'profile' as const, label: 'Profile', description: 'Settings & preferences', icon: User, color: 'text-purple-500' },
]
```

**Step 2: Verify More sheet opens and shows all items**

Run: `npm run dev`, tap More, confirm all items appear. Routines should NOT be listed here (it's now a primary nav item).

**Step 3: Commit**

```bash
git add components/more-sheet.tsx
git commit -m "feat(nav): add Expenses and Insights to More sheet"
```

---

### Task 4: Create the Spending card component

**Files:**
- Create: `components/feed/spending-card.tsx`

**Step 1: Create the component**

```typescript
'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'

interface SpendingCardProps {
  todayTotal: number
  weekTotal: number
  monthTotal: number
  lastMonthTotal: number
  dailyAllowance: number | null
  currency: string
  annotation?: string | null
  onTap: () => void
}

const CURRENCY_LOCALES: Record<string, string> = {
  VND: 'vi-VN',
  USD: 'en-US',
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SpendingCard({
  todayTotal,
  weekTotal,
  monthTotal,
  lastMonthTotal,
  dailyAllowance,
  currency,
  annotation,
  onTap,
}: SpendingCardProps) {
  const monthChange = lastMonthTotal > 0
    ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : null
  const isDown = monthChange !== null && monthChange < 0

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.ios}
      className="w-full ios-card p-4 text-left"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Spending</span>
        {monthChange !== null && (
          <div className={`ml-auto flex items-center gap-1 text-xs font-medium ${isDown ? 'text-emerald-600' : 'text-red-500'}`}>
            {isDown ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {Math.abs(monthChange)}% vs last month
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-base font-semibold tabular-nums">{formatAmount(todayTotal, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Week</p>
          <p className="text-base font-semibold tabular-nums">{formatAmount(weekTotal, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Month</p>
          <p className="text-base font-semibold tabular-nums">{formatAmount(monthTotal, currency)}</p>
        </div>
      </div>

      {/* Budget pace */}
      {dailyAllowance !== null && (
        <p className="text-xs text-muted-foreground mb-2">
          {dailyAllowance >= 0 ? (
            <>Daily allowance: <span className="font-medium text-foreground">{formatAmount(dailyAllowance, currency)}</span></>
          ) : (
            <>Over budget by: <span className="font-medium text-red-500">{formatAmount(Math.abs(dailyAllowance), currency)}</span>/day</>
          )}
        </p>
      )}

      {/* AI annotation */}
      {annotation && (
        <p className="text-xs text-muted-foreground/80 italic">{annotation}</p>
      )}
    </motion.button>
  )
}
```

**Step 2: Commit**

```bash
git add components/feed/spending-card.tsx
git commit -m "feat(feed): create spending + budget card component"
```

---

### Task 5: Create the Calories + Water card component

**Files:**
- Create: `components/feed/calories-card.tsx`

**Step 1: Create the component**

```typescript
'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Flame, Droplets } from 'lucide-react'

interface CaloriesCardProps {
  caloriesConsumed: number
  calorieGoal: number | null
  waterMl: number
  waterGoalMl: number
  annotation?: string | null
  onTap: () => void
}

function ProgressRing({ progress, size = 48, strokeWidth = 4, color }: {
  progress: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - Math.min(progress, 1) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={springs.ios}
      />
    </svg>
  )
}

export function CaloriesCard({
  caloriesConsumed,
  calorieGoal,
  waterMl,
  waterGoalMl,
  annotation,
  onTap,
}: CaloriesCardProps) {
  const calProgress = calorieGoal ? caloriesConsumed / calorieGoal : 0
  const waterProgress = waterGoalMl > 0 ? waterMl / waterGoalMl : 0

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.ios}
      className="w-full ios-card p-4 text-left"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Flame className="h-4 w-4 text-orange-500" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Nutrition</span>
      </div>

      {/* Progress rings side by side */}
      <div className="flex items-center gap-6 mb-2">
        {/* Calories */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <ProgressRing progress={calProgress} color="var(--color-orange-500, #f97316)" />
            <Flame className="absolute inset-0 m-auto h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-base font-semibold tabular-nums">{Math.round(caloriesConsumed)}</p>
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
            <p className="text-base font-semibold tabular-nums">{(waterMl / 1000).toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground">
              / {(waterGoalMl / 1000).toFixed(1)}L water
            </p>
          </div>
        </div>
      </div>

      {/* AI annotation */}
      {annotation && (
        <p className="text-xs text-muted-foreground/80 italic">{annotation}</p>
      )}
    </motion.button>
  )
}
```

**Step 2: Commit**

```bash
git add components/feed/calories-card.tsx
git commit -m "feat(feed): create calories + water card component"
```

---

### Task 6: Create the Routine card component

**Files:**
- Create: `components/feed/routine-card.tsx`

**Step 1: Create the component**

```typescript
'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Sparkles, Zap, Flame as StreakIcon } from 'lucide-react'

interface RoutineCardProps {
  completedToday: boolean
  currentStreak: number
  totalXp: number
  level: number
  annotation?: string | null
  onTap: () => void
}

export function RoutineCard({
  completedToday,
  currentStreak,
  totalXp,
  level,
  annotation,
  onTap,
}: RoutineCardProps) {
  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.ios}
      className="w-full ios-card p-4 text-left"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
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
      <div className="flex items-center gap-6 mb-2">
        <div className="flex items-center gap-2">
          <StreakIcon className="h-4 w-4 text-orange-500" />
          <div>
            <p className="text-base font-semibold tabular-nums">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <div>
            <p className="text-base font-semibold tabular-nums">Lv.{level}</p>
            <p className="text-xs text-muted-foreground">{totalXp} XP</p>
          </div>
        </div>
      </div>

      {/* AI annotation */}
      {annotation && (
        <p className="text-xs text-muted-foreground/80 italic">{annotation}</p>
      )}
    </motion.button>
  )
}
```

**Step 2: Commit**

```bash
git add components/feed/routine-card.tsx
git commit -m "feat(feed): create routine progress card component"
```

---

### Task 7: Create the AI feed annotations API route

**Files:**
- Create: `app/api/ai/feed-annotations/route.ts`

**Step 1: Create the API route**

Follow the existing `weekly-digest` pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm-service'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are a personal assistant providing brief, contextual annotations for a daily dashboard. Given the user's current data snapshot, generate one short annotation per card.

Return JSON:
{
  "spending": "One sentence about their spending today/this week (max 20 words)",
  "calories": "One sentence about their nutrition/hydration (max 20 words)",
  "routine": "One sentence about their routine streak/progress (max 20 words)"
}

Rules:
- Be specific with numbers from the data
- Be warm and motivating, not judgmental
- If a metric is doing well, acknowledge it
- If something needs attention (streak at risk, over budget), gently nudge
- Keep each annotation to ONE short sentence
- Do not use emoji`

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!llmService.isConfigured()) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const currentMonth = now.toISOString().slice(0, 7)

  const [
    todayExpenses,
    weekExpenses,
    monthExpenses,
    budgets,
    todayMeals,
    calorieGoal,
    waterLog,
    userProfile,
    routineStreak,
    routineStats,
    todayRoutines,
  ] = await Promise.all([
    supabase.from('expenses').select('amount').eq('user_id', user.id)
      .gte('transaction_date', todayStart),
    supabase.from('expenses').select('amount').eq('user_id', user.id)
      .gte('transaction_date', weekStart.toISOString()),
    supabase.from('expenses').select('amount').eq('user_id', user.id)
      .gte('transaction_date', monthStart),
    supabase.from('budgets').select('amount, category').eq('user_id', user.id)
      .eq('month', currentMonth),
    supabase.from('meals').select('calories').eq('user_id', user.id)
      .eq('meal_date', todayStr),
    supabase.from('calorie_goals').select('daily_calories').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('water_logs').select('amount_ml').eq('user_id', user.id)
      .eq('date', todayStr).single(),
    supabase.from('user_profiles').select('daily_water_goal_ml').eq('user_id', user.id)
      .single(),
    supabase.from('user_routine_streaks').select('current_streak, longest_streak')
      .eq('user_id', user.id).single(),
    supabase.from('user_routine_stats').select('total_xp, current_level')
      .eq('user_id', user.id).single(),
    supabase.from('routine_completions').select('id').eq('user_id', user.id)
      .eq('routine_date', todayStr),
  ])

  const todayTotal = (todayExpenses.data || []).reduce((s, e) => s + e.amount, 0)
  const weekTotal = (weekExpenses.data || []).reduce((s, e) => s + e.amount, 0)
  const monthTotal = (monthExpenses.data || []).reduce((s, e) => s + e.amount, 0)
  const totalBudget = (budgets.data || []).reduce((s, b) => s + b.amount, 0)
  const budgetUsedPct = totalBudget > 0 ? Math.round((monthTotal / totalBudget) * 100) : null

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - now.getDate()
  const dailyAllowance = totalBudget > 0 && daysRemaining > 0
    ? Math.round((totalBudget - monthTotal) / daysRemaining)
    : null

  const todayCalories = (todayMeals.data || []).reduce((s, m) => s + (m.calories || 0), 0)
  const calGoal = calorieGoal.data?.daily_calories || null

  const snapshot = {
    spending: {
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
      budget_total: totalBudget,
      budget_used_pct: budgetUsedPct,
      daily_allowance: dailyAllowance,
    },
    nutrition: {
      calories_today: todayCalories,
      calorie_goal: calGoal,
      water_ml: waterLog.data?.amount_ml || 0,
      water_goal_ml: userProfile.data?.daily_water_goal_ml || 2000,
    },
    routine: {
      completed_today: (todayRoutines.data || []).length > 0,
      current_streak: routineStreak.data?.current_streak || 0,
      longest_streak: routineStreak.data?.longest_streak || 0,
      current_level: routineStats.data?.current_level || 1,
      total_xp: routineStats.data?.total_xp || 0,
    },
    time_of_day: now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening',
  }

  const response = await llmService.completion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Current state:\n${JSON.stringify(snapshot, null, 2)}` },
    ],
    temperature: 0.6,
    maxTokens: 300,
    cacheKey: `feed-annotations:${user.id}:${todayStr}:${now.getHours() < 12 ? 'am' : 'pm'}`,
    cacheTTL: 6 * 60 * 60 * 1000, // 6 hours
  })

  if (!response) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  const parsed = llmService.parseJSON<{
    spending: string
    calories: string
    routine: string
  }>(response.content)

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }

  return NextResponse.json(parsed)
}
```

**Step 2: Commit**

```bash
git add app/api/ai/feed-annotations/route.ts
git commit -m "feat(feed): add AI feed annotations API route"
```

---

### Task 8: Create the `useFeedAnnotations` hook

**Files:**
- Create: `lib/hooks/use-feed-annotations.ts`
- Modify: `lib/hooks/query-keys.ts:215-221`
- Modify: `lib/hooks/index.ts` (add export at bottom)

**Step 1: Add query key**

In `lib/hooks/query-keys.ts`, add `feedAnnotations` to the `ai` object:

```typescript
ai: {
  all: ['ai'] as const,
  parseInput: () => [...queryKeys.ai.all, 'parse-input'] as const,
  habitCoach: () => [...queryKeys.ai.all, 'habit-coach'] as const,
  weeklyDigest: () => [...queryKeys.ai.all, 'weekly-digest'] as const,
  feedAnnotations: () => [...queryKeys.ai.all, 'feed-annotations'] as const,
},
```

**Step 2: Create the hook**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

interface FeedAnnotations {
  spending: string
  calories: string
  routine: string
}

export function useFeedAnnotations(options?: { enabled?: boolean }) {
  return useQuery<FeedAnnotations>({
    queryKey: queryKeys.ai.feedAnnotations(),
    queryFn: async () => {
      const res = await fetch('/api/ai/feed-annotations')
      if (!res.ok) throw new Error('Failed to fetch feed annotations')
      return res.json()
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
    retry: 1,
    enabled: options?.enabled ?? true,
  })
}
```

**Step 3: Export from hooks barrel**

Add to `lib/hooks/index.ts` at the bottom of the AI Layer section:

```typescript
export { useFeedAnnotations } from './use-feed-annotations'
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add lib/hooks/query-keys.ts lib/hooks/use-feed-annotations.ts lib/hooks/index.ts
git commit -m "feat(feed): add useFeedAnnotations hook and query key"
```

---

### Task 9: Create the Feed view component

**Files:**
- Create: `components/views/feed-view.tsx`
- Modify: `components/views/index.ts` (add export)

**Step 1: Create the feed view**

This component orchestrates the three cards and consumes existing hooks:

```typescript
'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { springs, getStaggerDelay } from '@/lib/motion-system'
import { Wallet } from 'lucide-react'
import { SpendingCard } from '@/components/feed/spending-card'
import { CaloriesCard } from '@/components/feed/calories-card'
import { RoutineCard } from '@/components/feed/routine-card'
import {
  useExpenses,
  useBudgets,
  useCalorieStats,
  useCalorieGoal,
  useWaterLog,
  useRoutineStreak,
  useRoutineStats,
  useRoutines,
  useProfile,
  useFeedAnnotations,
} from '@/lib/hooks'
import type { ViewType } from '@/lib/constants/filters'

interface FeedViewProps {
  onNavigate: (view: ViewType) => void
}

function FeedCardSkeleton() {
  return (
    <div className="w-full ios-card p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div><div className="h-3 w-10 rounded bg-muted mb-1" /><div className="h-5 w-16 rounded bg-muted" /></div>
        <div><div className="h-3 w-10 rounded bg-muted mb-1" /><div className="h-5 w-16 rounded bg-muted" /></div>
        <div><div className="h-3 w-10 rounded bg-muted mb-1" /><div className="h-5 w-16 rounded bg-muted" /></div>
      </div>
    </div>
  )
}

export function FeedView({ onNavigate }: FeedViewProps) {
  const { data: profile } = useProfile()
  const currency = profile?.currency || 'VND'

  // Recomputes if the component re-renders on a new day (e.g. after pull-to-refresh past midnight)
  const dayKey = new Date().toDateString()
  const { todayStr, lastMonthStart, currentMonth } = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const d = now.getDate()
    return {
      todayStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      lastMonthStart: new Date(y, m - 1, 1).toISOString().split('T')[0],
      currentMonth: `${y}-${String(m + 1).padStart(2, '0')}`,
    }
  }, [dayKey])

  // Spending data -- only fetch from last month start (not entire history)
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses({
    startDate: lastMonthStart,
  })
  const { data: budgets = [] } = useBudgets({ month: currentMonth })

  const { todayTotal, weekTotal, monthTotal, lastMonthTotal } = useMemo(() => {
    const now = new Date()
    const todayDate = now.toDateString()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999)

    let today = 0, week = 0, month = 0, lastMonth = 0
    for (const e of expenses) {
      const d = new Date(e.transaction_date)
      if (d.toDateString() === todayDate) today += e.amount
      if (d >= weekStart) week += e.amount
      if (d >= monthStart) month += e.amount
      if (d >= prevMonthStart && d <= prevMonthSameDay) lastMonth += e.amount
    }
    return { todayTotal: today, weekTotal: week, monthTotal: month, lastMonthTotal: lastMonth }
  }, [expenses])

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - now.getDate()
  const dailyAllowance = totalBudget > 0 && daysRemaining > 0
    ? Math.round((totalBudget - monthTotal) / daysRemaining)
    : null

  // Calories + Water data
  const { data: calorieStats, isLoading: caloriesLoading } = useCalorieStats({
    startDate: todayStr,
    endDate: todayStr,
  })
  const { data: calorieGoal } = useCalorieGoal()
  const { data: waterData } = useWaterLog(todayStr)

  const todayCalories = calorieStats?.totalCalories ?? 0
  const calGoal = calorieGoal?.daily_calories ?? null
  const waterMl = waterData?.waterLog?.amount_ml ?? 0
  const waterGoalMl = waterData?.daily_goal_ml ?? 2500

  // Routine data
  const { data: streakData, isLoading: routineLoading } = useRoutineStreak()
  const { data: statsData } = useRoutineStats()
  const { data: routineData } = useRoutines({ startDate: todayStr })
  const completedToday = (routineData?.completions?.length ?? 0) > 0

  // AI annotations (non-blocking -- cards render without them)
  const hasAnyData = todayTotal > 0 || weekTotal > 0 || monthTotal > 0 || todayCalories > 0 || waterMl > 0 || completedToday
  const { data: annotations } = useFeedAnnotations({ enabled: hasAnyData })

  if (!expensesLoading && !caloriesLoading && !routineLoading && !hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Wallet className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Welcome to your daily feed</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Start by logging an expense, meal, or completing a routine to see your dashboard come alive.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.ios, delay: getStaggerDelay(0) }}
      >
        {expensesLoading ? (
          <FeedCardSkeleton />
        ) : (
          <SpendingCard
            todayTotal={todayTotal}
            weekTotal={weekTotal}
            monthTotal={monthTotal}
            lastMonthTotal={lastMonthTotal}
            dailyAllowance={dailyAllowance}
            currency={currency}
            annotation={annotations?.spending}
            onTap={() => onNavigate('expenses')}
          />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.ios, delay: getStaggerDelay(1) }}
      >
        {caloriesLoading ? (
          <FeedCardSkeleton />
        ) : (
          <CaloriesCard
            caloriesConsumed={todayCalories}
            calorieGoal={calGoal}
            waterMl={waterMl}
            waterGoalMl={waterGoalMl}
            annotation={annotations?.calories}
            onTap={() => onNavigate('calories')}
          />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.ios, delay: getStaggerDelay(2) }}
      >
        {routineLoading ? (
          <FeedCardSkeleton />
        ) : (
          <RoutineCard
            completedToday={completedToday}
            currentStreak={streakData?.current_streak ?? 0}
            totalXp={statsData?.total_xp ?? 0}
            level={statsData?.current_level ?? 1}
            annotation={annotations?.routine}
            onTap={() => onNavigate('routines')}
          />
        )}
      </motion.div>
    </div>
  )
}
```

**Step 2: Export from views barrel**

Add to `components/views/index.ts`:

```typescript
export { FeedView } from './feed-view';
```

**Step 3: Commit**

```bash
git add components/views/feed-view.tsx components/views/index.ts
git commit -m "feat(feed): create feed view component with card orchestration"
```

---

### Task 10: Integrate feed view into the main page

**Files:**
- Modify: `app/page.tsx`

This task wires the feed view into the main SPA. Several changes are needed:

**Step 1: Add FeedView to lazy imports**

After the existing lazy imports (around line 96), add:

```typescript
const FeedView = lazy(() => import('@/components/views').then(mod => ({ default: mod.FeedView })));
```

**Step 2: Change default view from 'expenses' to 'feed'**

At line 102, update the default:

```typescript
const [activeView, setActiveView] = useState<ViewType>((searchParams.get('view') as ViewType) || 'feed');
```

**Step 3: Enable budgets loading for feed view**

At line 112, update the enabled condition:

```typescript
const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(
  { month: currentMonth },
  { enabled: ['budget', 'expenses', 'feed'].includes(activeView) }
);
```

**Step 4: Update URL sync logic**

At lines 248-257, change references from `'expenses'` to `'feed'` as the default view:

```typescript
useEffect(() => {
  const currentView = searchParams.get('view') as ViewType;
  if (activeView !== 'feed' && activeView !== currentView) {
    router.replace(`/?view=${activeView}`, { scroll: false });
  } else if (activeView === 'feed' && currentView) {
    router.replace('/', { scroll: false });
  }
}, [activeView, router, searchParams]);
```

**Step 5: Update logo click handler**

At line 453, change to navigate to feed:

```typescript
onLogoClick={() => {
  setActiveView('feed')
  hapticFeedback('light')
}}
```

**Step 6: Update pull-to-refresh enabled views**

At line 461, add `'feed'`:

```typescript
enabled={['feed', 'expenses', 'budget', 'insights', 'calories', 'routines'].includes(activeView)}
```

**Step 7: Add feed view to the ViewTransition block**

Inside the ViewTransition (around line 574), add the feed case at the top before the expenses case:

```typescript
{activeView === 'feed' ? (
  <Suspense fallback={<ViewSkeleton />}>
    <ErrorBoundary errorTitle="Failed to load feed" errorDescription="Something went wrong while loading your daily feed">
      <FeedView onNavigate={setActiveView} />
    </ErrorBoundary>
  </Suspense>
) : activeView === 'expenses' ? (
```

**Step 8: Remove the inline expenses stats/search/filter block for feed view**

The block at lines 492-571 (QuickStatsOverview, BudgetAlerts, SearchBar, FilterButton, Section Header) is wrapped in `{activeView === 'expenses' && (...)}`. This stays as-is -- it only shows for expenses view, not feed. No change needed.

**Step 9: Verify the feed renders as default**

Run: `npm run dev` and open localhost:3000. The feed with 3 cards should render. Tapping a card should navigate to the corresponding view.

**Step 10: Commit**

```bash
git add app/page.tsx
git commit -m "feat(feed): integrate feed view as default home page"
```

---

### Task 11: Final verification and polish

**Step 1: Test all navigation paths**

Verify:
- App opens to "Today" feed view
- Bottom nav shows: Home | Workouts | [+] | Routines | More
- Tapping Home returns to feed
- Tapping each card navigates to the correct view (Expenses, Calories, Routines)
- More sheet shows Expenses, Insights, Calories, Budget, Recurring, Profile (NOT Routines -- it's in primary nav)
- Navigating to a More-sheet view works correctly
- The + button still opens NL input
- Logo click returns to feed

**Step 2: Test dark mode**

Toggle dark mode and verify all cards look correct with dark variants.

**Step 3: Verify TypeScript and build**

Run: `npx tsc --noEmit && npm run build`
Expected: No new errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(feed): polish and fix any issues from integration testing"
```
