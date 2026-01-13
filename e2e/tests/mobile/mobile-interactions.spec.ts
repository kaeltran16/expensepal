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

    await expect(page.locator('[data-testid="delete-action"]')).toBeVisible()
  })

  test('should work offline and queue changes', async ({ api, page, context }) => {
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

    await api.seedExpense({ merchant: 'New Expense', amount: 20000 })

    const content = page.locator('[data-testid="expense-list"]')
    const box = await content.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + 50)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2, box.y + 200, { steps: 20 })
      await page.mouse.up()
    }

    await expensesPage.waitForQuerySettle()
    await expensesPage.expectExpenseVisible('New Expense')
  })

  test('should display mobile-optimized bottom navigation', async ({ page }) => {
    await expensesPage.goto()

    await expect(page.locator('[data-testid="bottom-navigation"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-expenses"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-budget"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-insights"]')).toBeVisible()

    await page.click('[data-testid="nav-budget"]')
    await expect(page).toHaveURL(/view=budget/)
  })
})
