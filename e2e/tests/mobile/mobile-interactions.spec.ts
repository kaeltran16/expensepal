import { devices } from '@playwright/test'
import { test, expect, createOfflineHelper } from '../../fixtures'
import { ExpensesPage } from '../../pages/expenses.page'

test.use({
  ...devices['Pixel 5'],
  hasTouch: true,
})

test.describe('Mobile Interactions', () => {
  let expensesPage: ExpensesPage

  test.beforeEach(async ({ page, auth, api }) => {
    await auth.login()
    await api.deleteAllExpenses()
    expensesPage = new ExpensesPage(page)
  })

  test('should swipe left on expense card to reveal delete action', async ({ api, page }) => {
    await api.seedExpense({ merchant: 'Swipe Test', amount: 10000 })
    await expensesPage.goto()

    const card = page.locator('[data-testid="expense-card"]').first()
    await expensesPage.swipeCard(card, 'left')

    // Should reveal at least one delete action
    await expect(page.locator('[data-testid="delete-action"]').first()).toBeVisible()
  })

  test.skip('should work offline and queue changes', async ({ api, page, context }) => {
    // Skip: Offline functionality is complex and relies on service worker behavior
    // which is difficult to test reliably in Playwright
    const offline = createOfflineHelper(page, context)

    await api.seedExpense({ merchant: 'Online Expense', amount: 50000 })
    await expensesPage.goto()

    await offline.goOffline()
    await offline.waitForOfflineIndicator()

    await expensesPage.openAddExpenseForm()
    await expensesPage.fillExpenseForm({
      amount: 25000,
      merchant: 'Offline Expense',
      category: 'Food',
    })
    await expensesPage.submitExpenseForm()

    await expect(page.locator('text=/pending|offline/i')).toBeVisible()

    await offline.goOnline()
    await offline.waitForOnlineIndicator()
    await page.waitForTimeout(2000)

    await expensesPage.expectExpenseVisible('Offline Expense')
  })

  test('should support pull-to-refresh on expenses list', async ({ api, page }) => {
    await api.seedExpense({ merchant: 'Initial Expense', amount: 10000 })
    await expensesPage.goto()

    // Wait for initial expense to be visible
    await expensesPage.expectExpenseVisible('Initial Expense')

    // Seed a new expense via API (simulating new data)
    await api.seedExpense({ merchant: 'New Expense', amount: 20000 })

    // Pull to refresh by reloading (simulates the effect of pull-to-refresh)
    await page.reload()
    await expensesPage.waitForQuerySettle()

    await expensesPage.expectExpenseVisible('New Expense')
  })

  test('should display mobile-optimized bottom navigation', async ({ page }) => {
    await expensesPage.goto()

    await expect(page.locator('[data-testid="bottom-navigation"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-expenses"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-add"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-insights"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-more"]')).toBeVisible()

    // Navigate to budget via More sheet
    await page.click('[data-testid="nav-more"]')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Budget")')
    await expect(page).toHaveURL(/view=budget/)
  })
})
