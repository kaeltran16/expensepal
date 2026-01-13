# Playwright E2E Testing Plan for ExpensePal

## Overview

Migrate from Cypress to Playwright for E2E testing. Scope: Auth + Expenses + Budgets (core features) with mobile-specific tests.

## Folder Structure

```
e2e/
├── playwright.config.ts
├── fixtures/
│   ├── auth.fixture.ts          # Login helpers (UI + API)
│   ├── api.fixture.ts           # Data seeding (seedExpense, seedBudget)
│   ├── toast.fixture.ts         # Sonner toast assertions
│   └── offline.fixture.ts       # Offline simulation
├── pages/
│   ├── base.page.ts             # Shared page helpers
│   ├── login.page.ts            # Login page POM
│   ├── expenses.page.ts         # Expenses view POM
│   └── budget.page.ts           # Budget view POM
├── tests/
│   ├── auth/
│   │   └── auth-flow.spec.ts    # 6 tests
│   ├── expenses/
│   │   └── expense-crud.spec.ts # 8 tests
│   ├── budgets/
│   │   └── budget-management.spec.ts  # 6 tests
│   └── mobile/
│       └── mobile-interactions.spec.ts # 4 tests
└── helpers/
    └── wait-for-query.ts        # React Query settling helper
```

## Implementation Steps

### Phase 1: Setup

1. Install Playwright and dependencies:
   ```bash
   pnpm add -D @playwright/test
   pnpm exec playwright install
   ```

2. Create `e2e/playwright.config.ts`:
   - baseURL: `http://localhost:3000`
   - Projects: chromium, mobile-chrome (Pixel 5), mobile-safari (iPhone 13)
   - webServer: `pnpm dev`
   - Enable service workers for PWA testing

3. Add scripts to `package.json`:
   ```json
   "test:e2e": "playwright test",
   "test:e2e:ui": "playwright test --ui",
   "test:e2e:debug": "playwright test --debug"
   ```

### Phase 2: Fixtures

4. Create `e2e/fixtures/auth.fixture.ts`:
   - `login()` - UI login via dev form (test@test.com / test)
   - `loginViaAPI()` - Fast Supabase session injection
   - `logout()` - Sign out flow

5. Create `e2e/fixtures/api.fixture.ts`:
   - `seedExpense(data)` - POST /api/expenses
   - `seedBudget(data)` - POST /api/budgets
   - `deleteAllExpenses()` - Cleanup helper
   - `deleteAllBudgets()` - Cleanup helper

6. Create `e2e/fixtures/toast.fixture.ts`:
   - `checkToast(message, type)` - Assert Sonner toast content

7. Create `e2e/fixtures/offline.fixture.ts`:
   - `goOffline()` / `goOnline()` - Network simulation
   - `waitForOfflineIndicator()` - UI assertion

8. Create `e2e/helpers/wait-for-query.ts`:
   - `waitForQueryToSettle(page)` - Wait for React Query to complete

### Phase 3: Page Objects

9. Create `e2e/pages/base.page.ts`:
   - Navigation helpers
   - Common assertions
   - Query settle wrapper

10. Create `e2e/pages/login.page.ts`:
    - Locators: dev-email-input, dev-password-input, dev-login-btn
    - Actions: goto, loginWithDevCredentials
    - Assertions: expectDevLoginFormVisible, expectLoginError

11. Create `e2e/pages/expenses.page.ts`:
    - Locators: expense-card, add-expense-btn, expense-form
    - Actions: createExpense, editExpense, deleteExpense, searchExpenses, swipeCard
    - Assertions: expectExpenseCount, expectExpenseVisible

12. Create `e2e/pages/budget.page.ts`:
    - Locators: budget-card, set-budget-btn, budget-dialog
    - Actions: setBudget, updateBudget, switchToRecurringTab
    - Assertions: expectBudgetProgressPercent, expectOverBudgetWarning

### Phase 4: Test Files

13. Create `e2e/tests/auth/auth-flow.spec.ts` (6 tests):
    - Display login page for unauthenticated users
    - Show dev login form in development mode
    - Login successfully with valid credentials
    - Show error for invalid credentials
    - Logout successfully
    - Protect routes when not authenticated

14. Create `e2e/tests/expenses/expense-crud.spec.ts` (8 tests):
    - Display empty state when no expenses
    - Create a new expense via form
    - Edit an existing expense
    - Delete an expense with confirmation
    - Filter expenses by search query
    - Show expenses sorted by date
    - Update quick stats after adding expense
    - Persist expense after page reload

15. Create `e2e/tests/budgets/budget-management.spec.ts` (6 tests):
    - Display budget view with tabs
    - Create a new budget for a category
    - Update an existing budget
    - Show budget progress based on expenses
    - Show over-budget warning when exceeded
    - Switch between Budgets and Recurring tabs

16. Create `e2e/tests/mobile/mobile-interactions.spec.ts` (4 tests):
    - Swipe left on expense card to reveal delete action
    - Work offline and queue changes
    - Support pull-to-refresh on expenses list
    - Display mobile-optimized bottom navigation

### Phase 5: Add data-testid Attributes

17. Add missing `data-testid` attributes to components:
    - `components/views/expenses-view.tsx` - expense-card, add-expense-btn, empty-expenses
    - `components/views/budget-view.tsx` - budget-card, set-budget-btn, budget-progress
    - `components/bottom-navigation.tsx` - nav-expenses, nav-budget, nav-insights
    - `components/ui/quick-expense-form.tsx` - expense-form

## Critical Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add Playwright deps and scripts |
| `app/login/page.tsx` | Verify data-testid attributes |
| `components/views/expenses-view.tsx` | Add data-testid attributes |
| `components/views/budget-view.tsx` | Add data-testid attributes |
| `components/bottom-navigation.tsx` | Add data-testid attributes |
| `components/ui/swipeable-card.tsx` | Add delete-action testid |

## Test Count Summary

| Area | Tests |
|------|-------|
| Auth Flow | 6 |
| Expense CRUD | 8 |
| Budget Management | 6 |
| Mobile Interactions | 4 |
| **Total** | **24** |

## Verification

1. Run all tests: `pnpm test:e2e`
2. Run with UI mode: `pnpm test:e2e:ui`
3. Run specific test file: `pnpm test:e2e e2e/tests/auth/auth-flow.spec.ts`
4. Generate HTML report: `pnpm exec playwright show-report`

## Key Patterns from Old Cypress Tests to Preserve

- **Session management**: Dev email/password login for testing
- **Data seeding**: API-based test data creation (not UI)
- **Query settlement**: Wait for React Query before assertions
- **Toast verification**: Sonner toast notification checking
- **Offline simulation**: Network state testing via context.setOffline()
- **data-testid selectors**: Stable element selection
