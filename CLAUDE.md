# CLAUDE.md - AI Assistant Guide

> **Last Updated:** 2025-11-22
> **Project:** Expense Tracker (Saver)
> **Architecture Score:** 7.8/10 → Target: 9/10

This is a **mobile-first expense tracking PWA** with TanStack Query state management, iOS-native UI, and email auto-import from VIB/Grab banks.

---

## 📋 Quick Reference

### Tech Stack
- **Framework:** Next.js 14 (App Router), React 18, TypeScript 5.3
- **Database:** Supabase (PostgreSQL)
- **State:** TanStack Query v5 + React hooks (no global state library)
- **UI:** Tailwind CSS, shadcn/ui, Framer Motion, Radix UI
- **Charts:** Recharts (⚠️ 400 KB - consider replacing)
- **PWA:** Service Workers, web-push notifications

### Architecture Pattern
```
app/page.tsx (SPA orchestrator, 430 lines)
    ↓
Custom Business Hooks (use-expense-filters, use-expense-operations)
    ↓
TanStack Query (server state, optimistic updates)
    ↓
API Routes (/api/expenses, /api/budgets, /api/goals)
    ↓
Supabase PostgreSQL
```

### Key Design Principles
- **Single Page App** - All views on `app/page.tsx`, no multi-page routing
- **Mobile-First** - Thumb-friendly, one-handed use, 44px+ touch targets
- **Optimistic Updates** - Instant UI feedback, rollback on error
- **iOS-Native Feel** - Glass morphism, native gestures, smooth animations

---

## 🏗️ Current Architecture

### State Management (Rating: 9/10 ✅)
**Excellent TanStack Query integration:**
```typescript
// Custom hooks abstract business logic
lib/hooks/
  ├── use-expense-filters.ts    // Client-side filtering
  ├── use-expense-operations.ts // CRUD + undo/redo
  ├── use-sync-operations.ts    // Email sync
  └── use-pull-to-refresh.ts    // Touch gestures
```

**Pattern:**
- Server state: TanStack Query (caching, invalidation)
- UI state: React useState (activeView, filters)
- Optimistic updates on mutations
- Proper error handling with rollbacks

### Component Structure (Rating: 7/10 ⚠️)

**Well-Sized Components:**
- View components: 20-172 lines ✅
- Custom hooks: 70-160 lines ✅

**Large Components (Refactoring Needed):**
- `expandable-expense-card.tsx` - **415 lines** ⚠️
- `savings-goals.tsx` - **404 lines** ⚠️
- `category-insights.tsx` - **347 lines** ⚠️
- `quick-expense-form.tsx` - **279 lines**
- `weekly-summary.tsx` - **274 lines**

### API Architecture (Rating: 7/10 ⚠️)

**Current Pattern:**
```typescript
// app/api/expenses/route.ts
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Business logic...
}
```

**Issues:**
- Repetitive auth checks in every route
- No middleware pattern
- Manual query building

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
saver/
├── app/
│   ├── api/                    # API routes (RESTful)
│   ├── page.tsx                # Main SPA (430 lines)
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
│
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── views/                  # View components (20-170 lines) ✅
│   ├── expandable-expense-card.tsx  # 415 lines ⚠️ REFACTOR
│   ├── savings-goals.tsx            # 404 lines ⚠️ REFACTOR
│   ├── category-insights.tsx        # 347 lines ⚠️ REFACTOR
│   └── [other components]
│
├── lib/
│   ├── hooks/                  # Custom business hooks ✅
│   │   ├── use-expense-filters.ts
│   │   ├── use-expense-operations.ts
│   │   └── use-sync-operations.ts
│   ├── supabase.ts             # DB client + types
│   ├── email-parser.ts         # VIB/Grab parsers
│   └── utils.ts                # Helpers
│
└── supabase/
    └── schema.sql              # Database schema
```

---

## 🗄️ Database Schema (Quick Reference)

### Main Table: `expenses`
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND',
  transaction_date TIMESTAMPTZ NOT NULL,
  merchant TEXT NOT NULL,
  source TEXT CHECK (source IN ('manual', 'email')),
  category TEXT DEFAULT 'Other',
  notes TEXT,
  -- Email-specific fields
  card_number TEXT,
  cardholder TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Indexes for performance
CREATE INDEX idx_expenses_transaction_date ON expenses(transaction_date DESC);
CREATE INDEX idx_expenses_merchant ON expenses(merchant);
CREATE INDEX idx_expenses_category ON expenses(category);
```

### Other Tables
- `categories` - Category metadata (name, color, icon)
- `budgets` - Monthly category budgets
- `goals` - Savings goals
- `push_subscriptions` - PWA notifications

---

## 🔌 API Conventions

### REST Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | List expenses (with filters) |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/[id]` | Update expense |
| DELETE | `/api/expenses/[id]` | Delete expense |
| POST | `/api/email/sync` | Trigger email sync |
| GET/POST | `/api/budgets` | Budget CRUD |
| GET/POST | `/api/goals` | Goals CRUD |

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
4. Maintain type safety (no `any` types)
5. Support dark mode (`dark:` variants)
6. Use optimistic updates for mutations
7. Add ARIA labels for accessibility

**Never:**
1. Break the single-page app pattern (no new pages)
2. Add npm packages without justification
3. Use inline styles (use Tailwind)
4. Skip error handling in async functions
5. Remove animations (users expect smooth transitions)
6. Forget to update TypeScript types

### Questions to Ask Before Implementing

1. Does this fit the mobile-first philosophy?
2. Is there already a similar component to reuse?
3. How does this work in dark mode?
4. What happens if network is slow/offline?
5. Is this accessible (keyboard nav, screen readers)?

---

## 🔧 Common Tasks

### Adding a New Email Parser (Example: ACB Bank)

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
npm run dev           # Development server
npm run build         # Production build
npm start             # Production server
vercel --prod         # Deploy to production
```

---

## 📝 Changelog

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
