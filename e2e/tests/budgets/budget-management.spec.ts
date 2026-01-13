import { test, expect } from '../../fixtures'
import { BudgetPage } from '../../pages/budget.page'

test.describe('Budget Management', () => {
  let budgetPage: BudgetPage

  test.beforeEach(async ({ page, auth, api }) => {
    await auth.login()
    await api.deleteAllBudgets()
    await api.deleteAllExpenses()
    budgetPage = new BudgetPage(page)
    await budgetPage.goto()
  })

  test('should display budget view with tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("Budgets")')).toBeVisible()
    await expect(page.locator('button:has-text("Recurring")')).toBeVisible()
  })

  test('should create a new budget for a category', async ({ toast }) => {
    await budgetPage.setBudget('Food', 2000000)

    await toast.checkToast('Budget created', 'success')
    await budgetPage.expectBudgetVisible('Food')
  })

  test('should update an existing budget', async ({ api, page, toast }) => {
    await api.seedBudget({ category: 'Transport', amount: 1000000 })
    await page.reload()
    await budgetPage.waitForQuerySettle()

    await budgetPage.updateBudget('Transport', 1500000)

    await toast.checkToast('Budget updated', 'success')
    await budgetPage.expectBudgetAmount('Transport', '1,500,000')
  })

  test('should show budget progress based on expenses', async ({ api, page }) => {
    await api.seedBudget({ category: 'Food', amount: 1000000 })
    await api.seedExpense({ category: 'Food', amount: 500000 })

    await page.reload()
    await budgetPage.waitForQuerySettle()

    await budgetPage.expectBudgetProgressPercent('Food', 50)
  })

  test('should show over-budget warning when exceeded', async ({ api, page }) => {
    await api.seedBudget({ category: 'Shopping', amount: 500000 })
    await api.seedExpense({ category: 'Shopping', amount: 600000 })

    await page.reload()
    await budgetPage.waitForQuerySettle()

    await budgetPage.expectOverBudgetWarning('Shopping')
  })

  test('should switch between Budgets and Recurring tabs', async ({ page }) => {
    await budgetPage.switchToRecurringTab()
    await expect(page.locator('[data-testid="recurring-expenses"]')).toBeVisible()

    await budgetPage.switchToBudgetsTab()
    await expect(page.locator('[data-testid="budget-tracker"]')).toBeVisible()
  })
})
