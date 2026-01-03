# Testing Strategy Plan: Checkpoint 4.3

> **Status:** Ready for Implementation
> **Created:** 2026-01-03
> **Scope:** Full testing infrastructure with 520+ tests, Playwright E2E, GitHub Actions CI/CD

## Current State Assessment

### Test Infrastructure Status
- **Framework:** Vitest 4.0.13 (configured, ready)
- **Dependencies:** All installed (@testing-library/react, @testing-library/jest-dom, happy-dom)
- **Test Files:** ALL DELETED (15 files removed from working tree)
- **Current Coverage:** ~0-5% (essentially nothing)
- **Target Coverage:** 80%+

### What Was Deleted
```
__tests__/
├── api/                    (7 test files)
├── lib/                    (4 test files)
├── mocks/                  (3 mock files)
└── setup.ts               (test configuration)
```

---

## Implementation Strategy

### Phase A: Foundation (Day 1) - ~2 hours

**A1. Recreate Test Setup**
```
__tests__/
├── setup.ts                    # Vitest setup with global mocks
└── mocks/
    ├── tanstack-query.ts       # useQuery, useMutation, useQueryClient
    ├── fetch.ts                # Global fetch mock
    ├── supabase.ts             # Database types + auth mock
    ├── sonner.ts               # Toast notifications
    └── utils.ts                # hapticFeedback, formatCurrency
```

**Files to Create:**
1. `__tests__/setup.ts` - Import jest-dom, configure mocks, beforeEach cleanup
2. `__tests__/mocks/tanstack-query.ts` - Mock TanStack Query hooks
3. `__tests__/mocks/fetch.ts` - Mock fetch with configurable responses
4. `__tests__/mocks/supabase.ts` - Mock Supabase client and types
5. `__tests__/mocks/utils.ts` - Mock utility functions

---

### Phase B: Analytics Unit Tests (Day 1-2) - ~3 hours

**Highest ROI - Pure functions, no external dependencies**

**B1. lib/analytics/ Tests** (~50-60 test cases)

| File | Functions | Test Cases |
|------|-----------|-----------|
| `calculate-trends.ts` | `calculateMonthOverMonthTrends`, `detectNewCategories` | 12-15 |
| `detect-patterns.ts` | `detectWeekendWeekdayPatterns`, `findTopSpendingCategory` | 13-16 |
| `generate-alerts.ts` | `detectSpendingSpikes`, `detectSpendingVelocity` | 14-18 |
| `generate-insights.ts` | `generateInsights` (orchestrator) | 5-6 |

**Test File Structure:**
```
__tests__/lib/analytics/
├── calculate-trends.test.ts
├── detect-patterns.test.ts
├── generate-alerts.test.ts
└── generate-insights.test.ts
```

**Edge Cases to Cover:**
- Empty expense arrays
- Single expense
- No previous month data
- Threshold boundaries (25%, 30%, 2.5x)
- Weekend/weekday classification
- Date boundary handling

---

### Phase C: Hook Unit Tests (Days 2-4) - ~8 hours

**C1. High Priority Hooks** (~200 test cases)

| Hook | Lines | Complexity | Test Cases |
|------|-------|-----------|-----------|
| `use-expenses.ts` | 326 | Very High | 45 |
| `use-meals.ts` | 391 | Very High | 50 |
| `use-budgets.ts` | 240 | High | 35 |
| `use-goals.ts` | 286 | High | 40 |
| `use-workouts.ts` | 320 | High | 40 |

**Test File Structure:**
```
__tests__/hooks/
├── use-expenses.test.ts
├── use-meals.test.ts
├── use-budgets.test.ts
├── use-goals.test.ts
└── use-workouts.test.ts
```

**Key Testing Patterns:**
1. **TanStack Query mocking:**
   - Mock `useQuery` return values
   - Mock `useMutation` with onMutate/onSuccess/onError
   - Verify `queryClient.invalidateQueries()` calls

2. **Optimistic Update Testing:**
   - Test temporary data injection
   - Test rollback on error
   - Verify cache key updates

3. **Cascade Invalidation:**
   - Verify related queries invalidated (e.g., expenses → stats, meals)

**C2. Medium Priority Hooks** (~100 test cases)

| Hook | Test Cases |
|------|-----------|
| `use-goal-operations.ts` | 30 |
| `use-expense-operations.ts` | 20 |
| `use-insights.ts` | 15 |
| `use-stats.ts` | 20 |
| `use-offline-queue.ts` | 30 |

---

### Phase D: Component Tests (Days 4-5) - ~6 hours

**D1. Refactored Component Tests** (~100 test cases)

**Workout Components:**
```
__tests__/components/workouts/
├── rest-timer.test.tsx         (6-8 tests)
├── exercise-set-tracker.test.tsx (10-12 tests)
├── workout-progress.test.tsx   (4-5 tests)
├── personal-record-badge.test.tsx (4-5 tests)
└── workout-summary.test.tsx    (8-10 tests)
```

**Expense Card Components:**
```
__tests__/components/expense-card/
├── expense-card-header.test.tsx   (8-10 tests)
├── expense-notes-editor.test.tsx  (6-8 tests)
└── delete-expense-dialog.test.tsx (4-5 tests)
```

**Goals Components:**
```
__tests__/components/goals/
├── savings-goal-card.test.tsx    (6-8 tests)
├── savings-goal-form.test.tsx    (6-8 tests)
└── savings-goal-progress.test.tsx (6-8 tests)
```

---

### Phase E: Integration Tests (Day 5-6) - ~4 hours

**Critical User Flows** (per IMPROVEMENT_ROADMAP.md):

**E1. Expense Creation Flow**
```typescript
// __tests__/integration/expense-flow.test.ts
// 1. Create expense
// 2. Verify cache update
// 3. Verify stats invalidation
// 4. Verify meal auto-creation (if food category)
// 5. Display in list
```

**E2. Budget Alert Flow**
```typescript
// __tests__/integration/budget-alert-flow.test.ts
// 1. Set budget limit
// 2. Add expense exceeding limit
// 3. Verify alert generation
// 4. Test notification trigger
```

**E3. Offline Sync Flow**
```typescript
// __tests__/integration/offline-sync-flow.test.ts
// 1. Queue expense while offline
// 2. Simulate connection restore
// 3. Verify sync execution
// 4. Verify database update
```

**E4. Workout Logging Flow**
```typescript
// __tests__/integration/workout-flow.test.ts
// 1. Start workout from template
// 2. Log sets with weight/reps
// 3. PR detection
// 4. Complete workout
// 5. Summary display
```

---

### Phase F: E2E Tests with Playwright (Day 6-7) - ~4 hours

**F1. Playwright Setup**
```bash
npm install -D @playwright/test
npx playwright install
```

**F2. Playwright Configuration**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**F3. E2E Test Files**
```
e2e/
├── expense-creation.spec.ts    # Add expense, verify in list
├── budget-management.spec.ts   # Create budget, check alerts
├── workout-logging.spec.ts     # Log workout, PR detection
├── calorie-tracking.spec.ts    # Add meal, check stats
└── auth-flow.spec.ts           # Login/logout flow
```

---

### Phase G: GitHub Actions CI/CD (Day 7) - ~2 hours

**G1. CI Workflow**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run type-check
      - run: pnpm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**G2. Package.json Scripts Update**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:ci": "vitest run --coverage --reporter=junit",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "type-check": "tsc --noEmit"
  }
}
```

**G3. Pre-commit Hook with Husky**
```bash
# Setup
npm install -D husky lint-staged
npx husky init

# .husky/pre-commit
npm run type-check
npx lint-staged

# package.json
"lint-staged": {
  "*.{ts,tsx}": ["vitest related --run"]
}
```

---

## File Creation Order

1. `__tests__/setup.ts`
2. `__tests__/mocks/*.ts` (4 files)
3. `__tests__/lib/analytics/*.test.ts` (4 files)
4. `__tests__/hooks/*.test.ts` (10 files)
5. `__tests__/components/**/*.test.tsx` (12 files)
6. `__tests__/integration/*.test.ts` (4 files)
7. `playwright.config.ts`
8. `e2e/*.spec.ts` (5 files)
9. `.github/workflows/ci.yml`
10. `.husky/pre-commit`

**Total: ~45 files**

---

## Estimated Test Coverage

| Category | Files | Test Cases | Coverage Target |
|----------|-------|-----------|----------------|
| Analytics | 4 | 50-60 | 95% |
| Hooks | 10 | 300-350 | 80% |
| Components | 12 | 80-100 | 75% |
| Integration | 4 | 15-20 | N/A |
| E2E (Playwright) | 5 | 20-30 | Critical paths |
| **Total** | **35+** | **~520** | **80%+** |

---

## Known Bugs to Fix During Testing

1. **use-expenses.ts (Lines 144, 163, 173):**
   - Bug: `queryKeys.expenses.lists()` should be `queryKeys.expenses.list(filters)`

2. **use-goals.ts (Line 263):**
   - Potential wrong query key in setQueriesData

---

## Success Criteria

- [ ] All test files created and passing
- [ ] 80%+ code coverage (Vitest)
- [ ] No flaky tests
- [ ] Playwright E2E tests for 5 critical flows
- [ ] GitHub Actions CI running on push/PR
- [ ] Pre-commit hook with Husky configured
- [ ] Coverage reports published to Codecov

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| A: Foundation | 2 hours | Setup + mocks |
| B: Analytics | 3 hours | 50-60 tests |
| C: Hooks | 8 hours | 300 tests |
| D: Components | 6 hours | 100 tests |
| E: Integration | 4 hours | 20 tests |
| F: E2E (Playwright) | 4 hours | 25 E2E tests |
| G: CI/CD (GitHub Actions) | 2 hours | Workflows + Husky |
| **Total** | **~29 hours** | **~520 tests** |

---

## Dependencies to Install

```bash
# Testing
pnpm add -D @vitest/coverage-v8

# E2E
pnpm add -D @playwright/test
npx playwright install

# CI/CD Tooling
pnpm add -D husky lint-staged
```
