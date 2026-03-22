# Homepage Bento Dashboard Redesign

## Problem

The current homepage (feed view) is redundant — it shows a watered-down version of the expenses view with sparse content, generic styling, and wrong priorities. Users open the app wanting to see their spending and transactions, not a dashboard of dashboards.

## Solution

Two-phase change:

1. **Phase A:** Make the expenses view the default home tab (swap `feed` → `expenses` as the default `activeView`)
2. **Phase B:** Redesign the expenses view stats section with a bento dashboard grid that provides information density, visual variety, and actionable financial intelligence

> Note: During brainstorming we explored three options (A, B, C). Option B was "swap + light polish" which we skipped in favor of going straight to "full redesign" (originally called C). Renamed here to Phase A + Phase B for sequential clarity.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default tab | Expenses (not feed) | Feed was redundant, expenses is what users actually want |
| Stats section | Bento grid (3 tiles) | Information density with visual variety — addresses "too empty" and "not exciting" feedback |
| QuickStatsOverview | Replace entirely | One view, one design — no reason to maintain two stats components |
| BudgetAlerts | Integrate into budget tile | Orange dot indicator on budget tile when any category >80%, tap for details. No extra cards eating vertical space |
| Collapsing header | Keep as-is | System-wide pattern provides consistency, gets out of the way fast on scroll |
| Search + Filter | Keep as-is | Works well, positioned below bento grid |
| Transaction list | Keep as-is | ExpandableExpenseCard with date groups unchanged |

## Architecture

### Phase A: Default Tab Swap

**Files changed:**

1. **`app/page.tsx`** — change initial `activeView` from `'feed'` to `'expenses'`:
   ```typescript
   // Before:
   const [activeView, setActiveView] = useState<ViewType>((searchParams.get('view') as ViewType) || 'feed');
   // After:
   const [activeView, setActiveView] = useState<ViewType>((searchParams.get('view') as ViewType) || 'expenses');
   ```

2. **`app/page.tsx`** — URL sync logic (lines 253-259), change `'feed'` to `'expenses'`:
   ```typescript
   // Before:
   if (activeView !== 'feed' && activeView !== currentView) {
     router.replace(`/?view=${activeView}`, { scroll: false });
   } else if (activeView === 'feed' && currentView) {
     router.replace('/', { scroll: false });
   }
   // After:
   if (activeView !== 'expenses' && activeView !== currentView) {
     router.replace(`/?view=${activeView}`, { scroll: false });
   } else if (activeView === 'expenses' && currentView) {
     router.replace('/', { scroll: false });
   }
   ```

3. **`app/page.tsx`** — Navbar `onLogoClick` handler (line 429), change to `'expenses'`:
   ```typescript
   onLogoClick={() => {
     setActiveView('expenses')  // was 'feed'
     hapticFeedback('light')
   }}
   ```

4. **`components/bottom-navigation.tsx`** — change first nav item:
   ```typescript
   // Before:
   { id: 'feed', label: 'Home', icon: Home }
   // After:
   { id: 'expenses', label: 'Home', icon: Home }
   ```
   Also update `MORE_VIEWS` array to remove `'expenses'` (it's now a primary nav item, not a "more" view):
   ```typescript
   // Before:
   const MORE_VIEWS: ViewType[] = ['expenses', 'insights', 'calories', 'budget', 'goals', 'recurring', 'summary', 'profile']
   // After:
   const MORE_VIEWS: ViewType[] = ['insights', 'calories', 'budget', 'goals', 'recurring', 'summary', 'profile']
   ```

5. **`components/collapsing-header.tsx`** — update `VIEW_TITLES` map: change `feed: 'Today'` to `expenses: 'Expenses'` (or keep both if feed code stays).

6. **`app/page.tsx`** — clean up dead `'feed'` references in enabled conditions (left over from when feed was the default):
   - `useBudgets` enabled condition (line 113): remove `'feed'` from the array → `{ enabled: ['budget', 'expenses'].includes(activeView) }`
   - `PullToRefreshWrapper` enabled condition (line 437): remove `'feed'` from the array → `enabled={['expenses', 'budget', 'insights', 'calories', 'routines'].includes(activeView)}`

**What stays:** All other views, bottom nav structure (Home, Workouts, +, Routines, More), feed-view code (stays in codebase, just unreachable from nav).

### Phase B: Bento Dashboard Redesign

**New component: `BentoStats`**

Single component replacing both `QuickStatsOverview` and `BudgetAlerts`. Lives at `components/bento-stats.tsx`.

Layout (top to bottom within the component):

1. **Today tile** (full width, `grid-column: 1 / -1`)
   - Today's spending total using `AnimatedCounter`
   - Transaction count for today
   - "vs average" comparison badge: compare today's total against average daily spend for the current month. Formula: `averageDailySpend = monthTotal / dayOfMonth`. Green pill when today < average ("↓ X% vs avg"), red pill when today > average ("↑ X% vs avg"). Hidden when todayTotal is 0.
   - **Not tappable** — user is already on the expenses view, no navigation needed

2. **Week tile** (left half of 2-col grid)
   - Week total amount
   - 7-day sparkline bar chart indexed by day-of-week (Sun=0 through Sat=6), matching `SpendingMiniChart`'s approach where each bar represents a weekday. Current day bar is `bg-primary`, past days `bg-primary/25`, future days `bg-muted`.
   - Day labels (S M T W T F S) below bars with current day highlighted in `text-primary`
   - **Not tappable** — informational only

3. **Budget tile** (right half of 2-col grid)
   - Budget used percentage: aggregate all budgets — `totalBudget = budgets.reduce((s, b) => s + b.amount, 0)`, then `usedPct = Math.round((monthSpentSoFar / totalBudget) * 100)`. Same approach as existing `QuickStatsOverview`.
   - SVG circular progress ring showing budget usage
   - Daily allowance text using `formatCurrency()` with user's currency: `remaining / remainingDaysInMonth`
   - Orange dot indicator (positioned absolute, top-right) when any single budget category exceeds 80% — reuse threshold logic from `BudgetAlerts`
   - When no budgets exist: hide the budget tile entirely, week tile expands to full width
   - **Tappable** — calls `onBudgetTap` which wires to `setActiveView('budget')` in `page.tsx`

**Props for BentoStats:**

```typescript
interface BentoStatsProps {
  todayTotal: number
  todayCount: number
  weekTotal: number
  monthTotal: number          // total spent this month — used for both budget % and average daily calc
  currency: string
  budgets: Budget[]
  expenses: Expense[]         // current month expenses, for sparkline + per-category budget alert check
  onBudgetTap: () => void     // navigates to budget view
}
```

> Note: `monthTotal` serves as both the "month spent so far" for budget calculations and the numerator for average daily spend. There is no separate `monthSpentSoFar` prop — they are semantically identical (current `page.tsx` already passes the same value for both).

The component computes internally:
- `averageDailySpend` = `monthTotal / new Date().getDate()`
- `sparklineData` = 7-element array indexed by weekday (Sun=0..Sat=6), computed from `expenses` filtered to current week
- `budgetAlertActive` = whether any category exceeds 80% of its budget (reuse logic from `BudgetAlerts`)
- `totalBudget` = `budgets.reduce((s, b) => s + b.amount, 0)`
- `usedPct` = `Math.round((monthTotal / totalBudget) * 100)`
- `dailyAllowance` = `(totalBudget - monthTotal) / remainingDaysInMonth`

**Skeleton:** New `BentoStatsSkeleton` matching the 3-tile grid layout with `animate-pulse` placeholders. Located in `components/bento-stats.tsx` (same file, exported separately).

**Edge cases:**

| State | Behavior |
|-------|----------|
| No expenses at all | Tiles show $0 / 0 transactions, no comparison badge, sparkline bars at minimum height. The transaction list below handles its own empty state. |
| No budgets set | Budget tile hidden, week tile expands to full width (`grid-column: 1 / -1`) |
| todayTotal is 0 | Show $0, "0 transactions", comparison badge hidden |
| Budget over 100% | Ring shows full circle, percentage shows actual (e.g. 115%), daily allowance shows "Over budget by X", ring color changes to `bg-destructive` |
| Loading state | Show `BentoStatsSkeleton` — 3 tiles with pulse animation matching bento grid layout |
| Error state | Relies on parent `ErrorBoundary` wrapping the expenses view block in `page.tsx` |

**Files changed (Phase B):**

- Create: `components/bento-stats.tsx` — new BentoStats component + BentoStatsSkeleton
- Modify: `app/page.tsx`:
  - Replace `QuickStatsOverview` + `QuickStatsSkeleton` + `BudgetAlerts` with `BentoStats` + `BentoStatsSkeleton` in the expenses view block
  - Remove `QuickStatsOverview`, `QuickStatsSkeleton`, `BudgetAlerts` imports
  - Add `BentoStats`, `BentoStatsSkeleton` imports
  - Pass `onBudgetTap={() => { setActiveView('budget'); hapticFeedback('light') }}` to BentoStats
  - Remove `monthSpentSoFar` prop computation (use `monthTotal` directly)
- No changes to: `SearchBar`, `FilterSheet`, `ExpandableExpenseCard`, `ExpensesView`

**Files to delete (after Phase B verified working):**

- `components/quick-stats-overview.tsx` — replaced by BentoStats
- `components/quick-stats-skeleton.tsx` — replaced by BentoStatsSkeleton
- `components/budget-alerts.tsx` — integrated into budget tile

### Visual Specifications

**Bento grid layout:**
- CSS grid: `grid-template-columns: 1fr 1fr`, `gap: 8px`
- Today tile: `grid-column: 1 / -1`
- Tile border-radius: 16px
- Background: `bg-card` (matches `ios-card` system — white in light mode, #1C1C1E in dark)
- Uses existing `ios-card` shadow system

**Today tile:**
- Amount: `text-4xl font-black tracking-tighter` with `AnimatedCounter`
- Currency symbol: `text-xl text-muted-foreground` using `getCurrencySymbol(currency)`
- Transaction count: `text-sm text-muted-foreground` — "{count} transactions"
- Comparison badge: `bg-success/15 text-success` (below avg) or `bg-destructive/15 text-destructive` (above avg), `text-[11px] font-semibold`, pill shape `rounded-lg px-2.5 py-1`. Shows "↓ X% vs avg" or "↑ X% vs avg". Hidden when todayTotal is 0.

**Week tile:**
- Amount: `text-2xl font-bold`
- Sparkline: 7 bars, flex layout with `items-end`, max height ~28px
- Current day bar: `bg-primary`, past days: `bg-primary/25`, future: `bg-muted`
- Day labels: `text-[8px]` below bars, current day in `text-primary font-bold`

**Budget tile:**
- Percentage: `text-2xl font-bold text-primary` (or `text-destructive` when >100%)
- SVG ring: 44x44px, `stroke-width: 4`, track: `stroke: hsl(var(--secondary))`, fill: `stroke: hsl(var(--primary))` (or `--destructive` when >100%)
- Daily allowance: `text-[11px] font-semibold text-success` formatted with `formatCurrency()`
- Alert dot: 8x8px, `bg-warning`, positioned `absolute top-2.5 right-3`, `box-shadow: 0 0 6px hsl(var(--warning) / 0.5)`

**Animations:**
- Use existing `motion-system.ts` springs and variants
- Stagger tile entrance: today at delay 0, week at 0.06, budget at 0.06
- `AnimatedCounter` for today's amount (1200ms duration)
- Budget ring: animate `stroke-dashoffset` from full to actual with 0.5s delay
- Sparkline bars: animate height from 0 with 40ms stagger per bar

### What Gets Removed

| Component | Reason |
|-----------|--------|
| `QuickStatsOverview` | Replaced by BentoStats |
| `QuickStatsSkeleton` | Replaced by BentoStatsSkeleton |
| `BudgetAlerts` | Integrated into budget tile |
| Feed as home tab | Expenses is now the default |

Feed view code (`components/views/feed-view.tsx`, `components/feed/*`) stays in the codebase but is unreachable from navigation. Cleanup in a separate pass.

## Non-Goals

- No changes to the transaction list (ExpandableExpenseCard)
- No changes to search/filter behavior
- No changes to bottom navigation item count or arrangement (only the first item's `id` changes from `feed` to `expenses`)
- No backend/API changes
- No changes to other views (budget, insights, calories, etc.)
- No cleanup of feed view code (separate task)
