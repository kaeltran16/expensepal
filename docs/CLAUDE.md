# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Last Updated:** 2026-01-02
> **Project:** ExpensePal - Expense & Fitness Tracker
> **Architecture Score:** 7.8/10 → Target: 9/10

This is a **mobile-first PWA** combining expense tracking and fitness logging with TanStack Query state management, iOS-native UI, email auto-import from VIB/Grab banks, and AI-powered insights via LLM integration.

---

## 📋 Quick Reference

### Tech Stack
- **Framework:** Next.js 14 (App Router), React 18, TypeScript 5.3
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **State:** TanStack Query v5 + React hooks (no global state library)
- **UI:** Tailwind CSS, shadcn/ui, Framer Motion, Radix UI
- **Charts:** Recharts (⚠️ 400 KB - consider replacing)
- **PWA:** Service Workers, web-push notifications
- **AI/LLM:** OpenRouter API (email parsing, insights, calorie estimation)
- **Email:** IMAP + Mailparser (transaction auto-import)
- **Testing:** Vitest + Testing Library

### Architecture Pattern
```
app/page.tsx (SPA orchestrator, ~200 lines)
    ↓
Custom Business Hooks (15+ hooks: expenses, budgets, goals, meals, workouts, exercises)
    ↓
TanStack Query (server state, optimistic updates, query key factory)
    ↓
API Routes (31 endpoints: /api/expenses, /api/budgets, /api/goals, /api/meals, /api/workouts, etc.)
    ↓  ↓
    │  └─→ LLM Service (OpenRouter API)
    ↓
Supabase PostgreSQL
```

### Key Design Principles
- **Single Page App** - All views on `app/page.tsx`, no multi-page routing
- **Mobile-First** - Thumb-friendly, one-handed use, 48px+ touch targets
- **Optimistic Updates** - Instant UI feedback, rollback on error
- **iOS-Native Feel** - Glass morphism, native gestures, smooth animations
- **Query Key Factory** - Centralized cache key management for related data invalidation

---

## 🏗️ Current Architecture

### State Management (Rating: 9/10 ✅)
**Excellent TanStack Query integration with 15+ custom hooks:**
```typescript
// Custom hooks abstract business logic by domain
lib/hooks/
  ├── query-keys.ts             // Query key factory (centralized)
  ├── use-expenses.ts           // Expense CRUD + optimistic updates
  ├── use-budgets.ts            // Budget management
  ├── use-goals.ts              // Savings goals
  ├── use-meals.ts              // Meal tracking
  ├── use-workouts.ts           // Workout logging
  ├── use-exercises.ts          // Exercise database
  ├── use-calorie-stats.ts      // Calorie analytics
  ├── use-profile.ts            // User profile
  ├── use-stats.ts              // Expense statistics
  └── ... 6 more hooks
```

**Query Key Factory Pattern** (`lib/hooks/query-keys.ts`):
```typescript
export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    list: (filters?: ExpenseFilters) => ['expenses', 'list', filters] as const,
  },
  budgets: {
    all: ['budgets'] as const,
    predictions: () => ['budgets', 'predictions'] as const,
  },
  // ... more domains
}
```

**Pattern:**
- Server state: TanStack Query (12-24 hour cache, automatic invalidation)
- UI state: React useState (activeView, filters, modals)
- Optimistic updates on all mutations
- Proper error handling with rollbacks
- Related query invalidation via query key factory

### Component Structure (Rating: 7/10 ⚠️)

**Well-Sized Components:**
- View components: 20-200 lines ✅ (8 views: expenses, budget, goals, analytics, workouts, calories, settings)
- Custom hooks: 70-330 lines ✅
- 60+ small components (20-100 lines)
- 20+ medium components (100-300 lines)

**Large Components (Refactoring Needed):**
- `workout-logger.tsx` - **1,020 lines** ⚠️⚠️ (largest, needs urgent refactoring)
- `expandable-expense-card.tsx` - **415 lines** ⚠️
- `savings-goals.tsx` - **404 lines** ⚠️
- `category-insights.tsx` - **347 lines** ⚠️
- `quick-expense-form.tsx` - **279 lines**
- `weekly-summary.tsx` - **274 lines**

### API Architecture (Rating: 7/10 ⚠️)

**31 RESTful API Endpoints** across domains:
- Expenses: `/api/expenses`, `/api/expenses/[id]`, `/api/stats`
- Budgets: `/api/budgets`, `/api/budgets/[id]`, `/api/budgets/predictions`
- Goals: `/api/goals`, `/api/goals/[id]`
- Fitness: `/api/meals`, `/api/workouts`, `/api/exercises`, `/api/calorie-stats`
- Integrations: `/api/email/sync`, `/api/ai-insights`
- And 17+ more endpoints

**Current Pattern:**
```typescript
// app/api/expenses/route.ts
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Business logic...
  // Some routes call LLM service for AI features
}
```

**Issues:**
- Repetitive auth checks in every route
- No middleware pattern (note: middleware.ts handles route-level auth, but not API handler helpers)
- Manual query building

**LLM Integration** (`lib/llm-service.ts`):
- OpenRouter API wrapper
- Used for: email parsing, category detection, budget recommendations, calorie estimation
- Centralized, reusable across entire codebase

---

## 🚀 Improvement Roadmap

### Phase 1: Component Refactoring (1-2 weeks)

#### Priority: Split Large Components

**1. ExpandableExpenseCard (415 lines) → 5 components**
```
components/expense-card/
  ├── ExpenseCardHeader.tsx      (~50 lines)
  ├── ExpenseCardDetails.tsx     (~70 lines)
  ├── ExpenseNotesEditor.tsx     (~80 lines)
  ├── ExpenseCardActions.tsx     (~40 lines)
  ├── DeleteExpenseDialog.tsx    (~60 lines)
  └── index.ts                   (exports)
```

**2. SavingsGoals (404 lines) → 5 components + hooks**
```
components/goals/
  ├── SavingsGoalForm.tsx        (~100 lines)
  ├── SavingsGoalCard.tsx        (~80 lines)
  ├── SavingsGoalProgress.tsx    (~50 lines)
  ├── SavingsGoalActions.tsx     (~40 lines)
  └── index.ts

lib/hooks/
  └── use-goal-operations.ts     (form state, calculations)
```

**3. CategoryInsights (347 lines) → Separate logic from UI**
```
lib/analytics/
  ├── calculate-trends.ts        (month-over-month)
  ├── detect-patterns.ts         (spending patterns)
  ├── generate-alerts.ts         (budget warnings)
  └── generate-insights.ts       (main orchestrator)

components/insights/
  ├── TrendInsightCard.tsx
  ├── PatternInsightCard.tsx
  └── AlertInsightCard.tsx
```

**4. Create Reusable UI Patterns**
```
components/ui/
  ├── empty-state.tsx            (standardized empty states)
  ├── error-state.tsx            (error handling UI)
  └── loading-container.tsx      (unified loading wrapper)
```

---

### Phase 2: API Architecture (1 week)

#### Create Middleware Pattern

**1. Auth Middleware**
```typescript
// lib/api/middleware.ts
export async function withAuth(
  handler: (req: NextRequest, user: User) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const { data: { user }, error } = await createClient().auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      return await handler(req, user)
    } catch (error) {
      console.error('API Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

// Usage:
export const GET = withAuth(async (request, user) => {
  const expenses = await fetchUserExpenses(user.id)
  return NextResponse.json({ expenses })
})
```

**2. Query Builder**
```typescript
// lib/api/query-builder.ts
export class ExpenseQueryBuilder {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  withFilters(filters: ExpenseFilters) {
    let query = this.supabase
      .from('expenses')
      .select('*')
      .eq('user_id', this.userId)
      .order('transaction_date', { ascending: false })

    if (filters.startDate) query = query.gte('transaction_date', filters.startDate)
    if (filters.endDate) query = query.lte('transaction_date', filters.endDate)
    if (filters.category) query = query.eq('category', filters.category)

    return query
  }
}
```

**3. Validation with Zod**
```typescript
// lib/api/schemas.ts
import { z } from 'zod'

export const CreateExpenseSchema = z.object({
  amount: z.number().positive(),
  merchant: z.string().min(1),
  category: z.string(),
  transaction_date: z.string().datetime(),
  notes: z.string().optional(),
})
```

---

### Phase 3: Performance Optimization (1 week)

#### 1. Virtual Scrolling (High Impact)
```bash
npm install @tanstack/react-virtual
```

```typescript
// components/views/expenses-view.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: filteredExpenses.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
  overscan: 5,
})
```

**Impact:** Smooth scrolling with 1000+ expenses

#### 2. Lazy Load Charts (Quick Win - 30 min)
```typescript
// app/page.tsx
const AnalyticsCharts = lazy(() => import('@/components/analytics-charts'))

{activeView === 'analytics' && (
  <Suspense fallback={<ChartSkeleton />}>
    <AnalyticsCharts expenses={expenses} />
  </Suspense>
)}
```

**Impact:** Save 400 KB on initial load

#### 3. Move Insights to TanStack Query
```typescript
// lib/hooks/use-insights.ts
export function useCategoryInsights(expenses: Expense[]) {
  return useQuery({
    queryKey: ['insights', expenses.length],
    queryFn: () => generateInsights(expenses),
    staleTime: 1000 * 60 * 5, // Cache for 5 min
  })
}
```

**Impact:** Avoid expensive recalculations

#### 4. Code Split Views
```typescript
const ExpensesView = lazy(() => import('@/components/views/expenses-view'))
const BudgetView = lazy(() => import('@/components/views/budget-view'))
const GoalsView = lazy(() => import('@/components/views/goals-view'))
```

---

### Phase 4: UI/UX Polish (Ongoing)

#### 1. Accessibility Enhancements
```typescript
// Add ARIA labels to icon buttons
<Button variant="ghost" size="icon" aria-label="Edit expense">
  <Edit2 className="h-4 w-4" />
  <span className="sr-only">Edit expense</span>
</Button>
```

```css
/* app/globals.css - Keyboard focus indicators */
.focus-visible:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: 0.5rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

#### 2. Standardized Empty States
```typescript
// components/ui/empty-state.tsx
export function EmptyState({
  icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-6xl mb-4"
      >
        {icon}
      </motion.div>
      <h3 className="ios-headline mb-2">{title}</h3>
      <p className="ios-caption text-muted-foreground mb-8">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="ripple-effect min-h-touch">
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}
```

#### 3. Error State Component
```typescript
// components/ui/error-state.tsx
export function ErrorState({
  title = "Something went wrong",
  description = "Please try again later",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="ios-card p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="ios-headline mb-2">{title}</h3>
      <p className="ios-caption text-muted-foreground mb-6">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  )
}
```

#### 4. Error Boundaries per View
```typescript
// components/error-boundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState onRetry={() => this.setState({ hasError: false })} />
    }
    return this.props.children
  }
}

// Usage:
<ErrorBoundary>
  <ExpensesView />
</ErrorBoundary>
```

---

## 🎯 Quick Wins (Implement First)

### Top 5 Priorities (4-5 hours total)

1. **Extract EmptyState component** (2 hours)
   - Impact: High reusability across 8+ components
   - Difficulty: Low

2. **Add withAuth middleware** (1 hour)
   - Impact: Cleaner API routes (-30% boilerplate)
   - Difficulty: Low

3. **Lazy load AnalyticsCharts** (30 min)
   - Impact: -400 KB bundle size
   - Difficulty: Very Low

4. **Add ARIA labels to icon buttons** (1 hour)
   - Impact: Accessibility compliance
   - Difficulty: Low

5. **Create ErrorBoundary wrapper** (1.5 hours)
   - Impact: Better error handling UX
   - Difficulty: Medium

---

## 📂 Directory Structure (Simplified)

```
expensepal/
├── app/
│   ├── api/                    # 31 API routes (expenses, budgets, goals, meals, workouts, etc.)
│   ├── page.tsx                # Main SPA (~200 lines)
│   ├── login/                  # Auth pages
│   ├── settings/               # User settings
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles + iOS animations
│
├── components/
│   ├── ui/                     # 40+ shadcn/ui primitives
│   ├── views/                  # 8 view components (20-200 lines) ✅
│   │   ├── expenses-view.tsx
│   │   ├── budget-view.tsx
│   │   ├── goals-view.tsx
│   │   ├── analytics-insights-view.tsx
│   │   ├── workouts-view.tsx
│   │   ├── calories-view.tsx
│   │   └── ... 2 more
│   ├── workouts/               # Workout-specific subcomponents (6 files)
│   ├── workout-logger.tsx      # 1,020 lines ⚠️⚠️ URGENT REFACTOR
│   ├── expandable-expense-card.tsx  # 415 lines ⚠️ REFACTOR
│   ├── savings-goals.tsx            # 404 lines ⚠️ REFACTOR
│   ├── category-insights.tsx        # 347 lines ⚠️ REFACTOR
│   └── ... 50+ other components
│
├── lib/
│   ├── hooks/                  # 15+ custom business hooks ✅
│   │   ├── query-keys.ts       # Query key factory
│   │   ├── use-expenses.ts     # Expense CRUD (~330 lines)
│   │   ├── use-budgets.ts
│   │   ├── use-goals.ts
│   │   ├── use-meals.ts
│   │   ├── use-workouts.ts
│   │   ├── use-exercises.ts
│   │   ├── use-calorie-stats.ts
│   │   └── ... 8 more hooks
│   ├── analytics/              # Business logic modules
│   │   ├── spending-insights.ts
│   │   ├── detect-recurring.ts
│   │   ├── budget-predictions.ts
│   │   └── budget-recommendations.ts
│   ├── supabase/               # DB client + auto-generated types
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── database.types.ts
│   ├── email-parser.ts         # VIB/Grab email parsers
│   ├── llm-service.ts          # OpenRouter API wrapper
│   ├── meal-utils.ts           # Calorie calculations
│   ├── calorie-estimator.ts    # LLM-based estimation
│   ├── timezone.ts             # Timezone-aware date handling
│   └── utils.ts                # Helpers (formatting, haptic feedback)
│
├── __tests__/                  # 15 test suites (Vitest)
│   ├── api/                    # API endpoint tests
│   ├── lib/                    # Utility tests
│   └── mocks/                  # Supabase, email service mocks
│
└── supabase/
    └── [database schema files]
```

---

## 🗄️ Database Schema (Quick Reference)

**Auto-generated types:** `lib/supabase/database.types.ts` (DO NOT edit manually)

### Main Tables

**Expense Tracking:**
- `expenses` - Transaction records (amount, merchant, category, date, source: 'email' | 'manual')
- `categories` - Category metadata (name, color, icon, user-customizable)
- `budgets` - Monthly category budgets with alerts
- `goals` - Savings goals with progress tracking

**Fitness Tracking:**
- `meals` - Meal logs (description, calories, meal_time: 'breakfast' | 'lunch' | 'dinner' | 'snack')
- `workouts` - Workout sessions (date, template_id, exercises_completed JSONB)
- `workout_templates` - Reusable workout plans (name, exercises array, user_id)
- `exercises` - Exercise database (name, category, muscle_group, equipment)
- `exercise_history` - Exercise performance tracking (sets, reps, weight, notes)
- `calorie_goals` - Daily calorie and macro targets (calories, protein, carbs, fat)

**System:**
- `push_subscriptions` - PWA push notification endpoints
- `profiles` - User profile data (extends Supabase auth.users)

### Key Schema Patterns
```sql
-- All tables follow this pattern:
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... table-specific fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) enabled on all tables
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can CRUD their own data" ON table_name
  FOR ALL USING (auth.uid() = user_id);

-- Performance indexes on frequently queried columns
CREATE INDEX idx_expenses_transaction_date ON expenses(transaction_date DESC);
CREATE INDEX idx_meals_date ON meals(date DESC);
CREATE INDEX idx_workouts_date ON workouts(date DESC);
```

---

## 🔌 API Conventions

### REST Endpoints (31 total)

**Expense Management:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | List expenses (with filters) |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/[id]` | Update expense |
| DELETE | `/api/expenses/[id]` | Delete expense |
| GET | `/api/stats` | Expense statistics & analytics |
| POST | `/api/email/sync` | Trigger email sync (IMAP) |

**Budget & Goals:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/budgets` | Budget CRUD |
| PUT/DELETE | `/api/budgets/[id]` | Update/delete budget |
| GET | `/api/budgets/predictions` | AI-powered budget predictions |
| GET/POST | `/api/goals` | Savings goals CRUD |
| PUT/DELETE | `/api/goals/[id]` | Update/delete goal |

**Fitness Tracking:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/meals` | Meal logging |
| PUT/DELETE | `/api/meals/[id]` | Update/delete meal |
| GET | `/api/calorie-stats` | Calorie analytics |
| GET/POST | `/api/workouts` | Workout logging |
| PUT/DELETE | `/api/workouts/[id]` | Update/delete workout |
| GET | `/api/exercises` | Exercise database |
| POST | `/api/exercises/favorites` | Toggle favorite exercise |

**AI & Insights:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai-insights` | Generate spending insights via LLM |
| POST | `/api/estimate-calories` | LLM-based calorie estimation |

### Request/Response Example
```typescript
// POST /api/expenses
{
  "amount": 50000,
  "currency": "VND",
  "merchant": "Starbucks",
  "category": "Food",
  "transaction_date": "2025-11-22T10:30:00Z",
  "source": "manual"
}

// Response
{
  "id": "uuid",
  "amount": 50000,
  "merchant": "Starbucks",
  ...
}
```

### LLM Service Integration

**OpenRouter API Wrapper** (`lib/llm-service.ts`):
```typescript
import { generateLLMResponse } from '@/lib/llm-service'

// Used throughout the codebase for AI features
const response = await generateLLMResponse(prompt, options)
```

**Common LLM Use Cases:**
1. **Email Parsing** - Extract transaction details from bank emails
2. **Category Detection** - Automatically categorize expenses by merchant name
3. **Budget Recommendations** - Generate personalized budget suggestions
4. **Spending Insights** - Analyze spending patterns and generate insights
5. **Calorie Estimation** - Estimate calories from meal descriptions

**Pattern:**
- Centralized service prevents duplicate API logic
- All LLM calls go through this single module
- Consistent error handling and retry logic
- Easy to switch LLM providers if needed

---

## 🎨 Styling Guidelines

### Tailwind Patterns

**Responsive (Mobile-First):**
```tsx
<div className="
  p-4           // Mobile
  md:p-6        // Tablet
  lg:p-8        // Desktop
  w-full
  md:w-1/2
">
```

**Touch-Friendly:**
```tsx
<Button className="
  min-h-touch     // 48px (iOS minimum)
  touch-lg        // 56px (primary actions)
  w-full
">
```

**Glass Morphism:**
```tsx
<div className="glass rounded-2xl p-6">
<Card className="frosted-card">
```

**Dark Mode:**
```tsx
<div className="
  bg-white dark:bg-gray-900
  text-gray-900 dark:text-gray-100
">
```

### Category Colors
```typescript
const CATEGORY_COLORS = {
  'Food': {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    border: 'border-l-orange-500',
    icon: '🍔'
  },
  'Shopping': {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    border: 'border-l-blue-500',
    icon: '🛍️'
  },
}
```

---

## 💻 Code Conventions

### TypeScript (Strict Typing)
```typescript
// ✅ Good
interface ExpenseFormData {
  amount: number
  merchant: string
  category: string
}

function handleSubmit(data: ExpenseFormData): Promise<void>

// ❌ Bad
function handleSubmit(data: any)
```

### Component Organization
```typescript
// 1. Imports (grouped)
import { useState } from 'react'              // React
import { Button } from '@/components/ui/button' // UI
import { supabase } from '@/lib/supabase'    // Utils
import type { Expense } from '@/lib/supabase' // Types

// 2. Types/Interfaces
interface Props { ... }

// 3. Constants
const DEFAULT_LIMIT = 10

// 4. Component
export function Component({ data }: Props) {
  // 4a. State
  const [state, setState] = useState()

  // 4b. Effects
  useEffect(() => {}, [])

  // 4c. Handlers
  const handleClick = () => {}

  // 4d. Derived values
  const total = useMemo(() => ..., [data])

  // 4e. Render
  return <div>...</div>
}
```

### Naming Conventions
- **Components:** PascalCase (`ExpenseCard`)
- **Files:** kebab-case (`expense-card.tsx`)
- **Functions:** camelCase (`handleSubmit`)
- **Constants:** SCREAMING_SNAKE_CASE (`API_BASE_URL`)

---

## 🚨 Best Practices for AI Assistants

### When Working with This Codebase

**Always:**
1. Read existing code before making changes
2. Follow established patterns (don't introduce new paradigms)
3. Test on mobile viewport (this is mobile-first)
4. Maintain type safety (no `any` types - use generated Supabase types)
5. Support dark mode (`dark:` variants)
6. Use optimistic updates for mutations (TanStack Query pattern)
7. Add ARIA labels for accessibility
8. Use the query key factory (`lib/hooks/query-keys.ts`) for cache invalidation
9. Follow the hook → API → Supabase pattern for new features
10. Regenerate TypeScript types after schema changes

**Never:**
1. Break the single-page app pattern (no new pages except auth/settings)
2. Add npm packages without justification
3. Use inline styles (use Tailwind)
4. Skip error handling in async functions
5. Remove animations (users expect smooth transitions)
6. Forget to update TypeScript types after schema changes
7. Manually edit `lib/supabase/database.types.ts` (auto-generated)
8. Expose service role key to client-side code
9. Skip Row Level Security (RLS) policies on new tables

### Questions to Ask Before Implementing

1. Does this fit the mobile-first philosophy?
2. Is there already a similar component/hook/pattern to reuse?
3. How does this work in dark mode?
4. What happens if network is slow/offline? (PWA considerations)
5. Is this accessible (keyboard nav, screen readers)?
6. Should this use the query key factory for cache invalidation?
7. Does this need RLS policies? (always yes for new tables)
8. Can this leverage the existing LLM service?
9. Is this feature scope-appropriate? (expense tracking OR fitness tracking)
10. Have I regenerated types after schema changes?

---

## 🔧 Common Tasks

### Task 1: Adding a New Email Parser (Example: ACB Bank)

1. **Update trusted senders:**
```typescript
// lib/email-service.ts
const TRUSTED_SENDERS = [
  'info@card.vib.com.vn',
  'no-reply@grab.com',
  'notifications@acb.com.vn'  // Add new
]
```

2. **Add parser:**
```typescript
// lib/email-parser.ts
export function parseACBEmail(body: string, subject: string) {
  const amountMatch = body.match(/Amount:\s*([\d,]+)\s*VND/)
  const merchantMatch = body.match(/Merchant:\s*(.+)/)

  return {
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    merchant: merchantMatch[1].trim(),
    transaction_date: new Date().toISOString(),
    currency: 'VND',
    source: 'email' as const,
  }
}
```

3. **Update main parser:**
```typescript
export async function parseEmail(email: any) {
  const from = email.from[0].address.toLowerCase()

  if (from === 'notifications@acb.com.vn') {
    return parseACBEmail(body, subject)
  }
  // ... other parsers
}
```

---

### Task 2: Adding a New Feature (Example: Water Intake Tracking)

Follow this pattern used for meals, workouts, and exercises:

1. **Create database table** (via Supabase dashboard or migration):
```sql
CREATE TABLE water_intake (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own data" ON water_intake
  FOR ALL USING (auth.uid() = user_id);

-- Add index
CREATE INDEX idx_water_intake_date ON water_intake(date DESC);
```

2. **Update TypeScript types**:
```bash
# Generate types from Supabase schema
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
```

3. **Create custom hook** (`lib/hooks/use-water-intake.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

export function useWaterIntake() {
  const queryClient = useQueryClient()

  const { data: intakes, isLoading } = useQuery({
    queryKey: queryKeys.water.list(),
    queryFn: async () => {
      const response = await fetch('/api/water-intake')
      return response.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { amount_ml: number }) => {
      const response = await fetch('/api/water-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.water.all })
    },
  })

  return { intakes, isLoading, createIntake: createMutation.mutate }
}
```

4. **Add query keys** (`lib/hooks/query-keys.ts`):
```typescript
export const queryKeys = {
  // ... existing keys
  water: {
    all: ['water'] as const,
    list: () => ['water', 'list'] as const,
  },
}
```

5. **Create API route** (`app/api/water-intake/route.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('water_intake')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ intakes: data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { amount_ml } = body

  const { data, error } = await supabase
    .from('water_intake')
    .insert({ user_id: user.id, amount_ml })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ intake: data })
}
```

6. **Create UI component** and integrate into `app/page.tsx`

**This pattern is consistent across all features: expenses, budgets, goals, meals, workouts, exercises.**

---

### Task 3: Implementing Optimistic Updates

Optimistic updates are a core pattern in this codebase for instant UI feedback. Example from `lib/hooks/use-expenses.ts`:

```typescript
export function useCreateExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newExpense: Partial<Expense>) => {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      })
      return response.json()
    },

    // Before mutation (optimistic update)
    onMutate: async (newExpense) => {
      // 1. Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

      // 2. Snapshot previous value
      const previousExpenses = queryClient.getQueryData(queryKeys.expenses.list())

      // 3. Optimistically update to the new value
      queryClient.setQueryData(queryKeys.expenses.list(), (old: any) => {
        const tempExpense = {
          ...newExpense,
          id: `temp-${Date.now()}`, // Temporary ID
          created_at: new Date().toISOString(),
        }
        return [tempExpense, ...(old?.expenses || [])]
      })

      // 4. Return context object with snapshot
      return { previousExpenses }
    },

    // On error, rollback
    onError: (err, newExpense, context) => {
      queryClient.setQueryData(
        queryKeys.expenses.list(),
        context?.previousExpenses
      )
      toast.error('Failed to create expense')
    },

    // On success, refetch to get real data from server
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
      toast.success('Expense created!')
    },
  })
}
```

**Key Benefits:**
- Instant UI feedback (no loading spinner)
- Automatic rollback on error
- Server sync on success
- Related queries invalidated (stats, budgets)

**Apply this pattern to all mutations (create, update, delete).**

---

## 📊 Quality Metrics

| Aspect | Current | Target | Action |
|--------|---------|--------|--------|
| Architecture | 8.5/10 | 9.5/10 | Add middleware, query builder |
| Components | 7/10 | 9/10 | **Refactor 3 large components** |
| State Mgmt | 9/10 | 9.5/10 | Move insights to TanStack Query |
| Performance | 7/10 | 9/10 | **Virtual scrolling, lazy loading** |
| Accessibility | 6/10 | 8.5/10 | **ARIA labels, keyboard nav** |
| Type Safety | 8/10 | 9/10 | Remove `any` types |

**Overall: 7.8/10** → **Target: 9/10**

---

## 🐛 Troubleshooting

### Database Connection Errors
1. Check `.env` has correct `NEXT_PUBLIC_SUPABASE_URL`
2. Verify anon key
3. Ensure RLS policies are set up

### Email Sync Not Working
1. IMAP enabled in Gmail?
2. Using App Password (not regular password)?
3. Email from trusted sender?

### Styles Not Applying
```bash
rm -rf .next
npm run dev
```

### PWA Not Installing
1. HTTPS required (localhost or deployed)
2. `manifest.json` correctly configured
3. Service Worker registered

---

## 📚 Resources

### Official Docs
- [Next.js](https://nextjs.org/docs) | [React](https://react.dev) | [Tailwind](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com) | [TanStack Query](https://tanstack.com/query)
- [Supabase](https://supabase.com/docs) | [Framer Motion](https://www.framer.com/motion)

### Project Docs
- `README.md` - User documentation
- `UI_ENHANCEMENTS.md` - Recent UI changes
- `PWA_SETUP.md` - PWA configuration

### Commands
```bash
# Development
npm run dev           # Start Next.js dev server (http://localhost:3000)
npm run build         # Production build
npm start             # Start production server

# Testing
npm run test          # Run Vitest tests
npm run test:ui       # Vitest UI (browser-based)

# Utilities
npm run import-exercises  # Import exercise database to Supabase

# Deployment
vercel --prod         # Deploy to production
```

---

## 🔐 Environment Variables

Required variables (see `.env.example`):
```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=         # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Public anon key
SUPABASE_SERVICE_ROLE_KEY=        # Server-side admin key (never expose to client)

# Email Integration (Optional - for transaction auto-import)
EMAIL_ENCRYPTION_KEY=             # AES-256 key for storing email credentials

# PWA Push Notifications (Optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=     # Web push public key
VAPID_PRIVATE_KEY=                # Web push private key

# AI/LLM Integration (Optional - for AI features)
OPENROUTER_API_KEY=               # OpenRouter API key for LLM features
```

**Important:**
- Never commit `.env` file to git (already in `.gitignore`)
- Use Vercel Environment Variables for production
- Service role key is ONLY for server-side API routes (never send to client)

---

## 📝 Changelog

**2026-01-02:** Major update - Fitness features & architecture
- Updated project scope to include fitness tracking (meals, workouts, exercises)
- Added LLM integration documentation (OpenRouter API)
- Documented query key factory pattern
- Expanded API endpoints from ~10 to 31 endpoints
- Added 15+ custom hooks documentation
- Added fitness tracking database schema (meals, workouts, exercises, calorie_goals)
- Added environment variables section
- Added testing commands (Vitest)
- Updated line counts to reflect current state
- Identified workout-logger.tsx (1,020 lines) as largest component needing refactoring

**2025-11-22:** Major update
- Added improvement roadmap (Phases 1-4)
- Condensed from 1630 → 650 lines (~60% reduction)
- Added quality metrics and priorities
- Identified component refactoring targets
- Added quick wins section

**2025-11-19:** Initial version
- Comprehensive codebase analysis
- Documented architecture and patterns

---

**This document is the single source of truth for AI assistants working on this project.**
