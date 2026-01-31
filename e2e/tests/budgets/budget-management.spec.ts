import { test, expect } from '../../fixtures'
import { BudgetPage } from '../../pages/budget.page'

// Run tests serially to avoid data conflicts since all tests share the same user account
test.describe.configure({ mode: 'serial' })

test.describe('Budget Management', () => {
  let budgetPage: BudgetPage

  test.beforeEach(async ({ page, auth, api }) => {
    await auth.login()
    await api.deleteAllBudgets()
    await api.deleteAllExpenses()
    budgetPage = new BudgetPage(page)
    await budgetPage.goto()
  })

  test('should display budget view', async ({ page }) => {
    // Budget view should show the budget tracker
    await expect(page.locator('[data-testid="budget-tracker"]')).toBeVisible()
  })

  test('should create a new budget for a category', async ({ toast }) => {
    await budgetPage.setBudget('Food', 2000000)

    await toast.checkToast(/Budget (created|set)/i, 'success')
    await budgetPage.expectBudgetVisible('Food')
  })

  test('should update an existing budget', async ({ api, page, toast }) => {
    await api.seedBudget({ category: 'Transport', amount: 1000000 })
    await page.reload()
    await budgetPage.waitForQuerySettle()

    await budgetPage.updateBudget('Transport', 1500000)

    await toast.checkToast(/Budget (updated|set)/i, 'success')
    // Note: App uses periods as thousands separators (European format)
    await budgetPage.expectBudgetAmount('Transport', '1.500.000')
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

  test('should navigate between Budget and Recurring views', async ({ page }) => {
    // Navigate to Recurring view
    await budgetPage.navigateToRecurring()
    await expect(page).toHaveURL(/view=recurring/)

    // Navigate back to Budget view
    await budgetPage.navigateToBudget()
    await expect(page).toHaveURL(/view=budget/)
    await expect(page.locator('[data-testid="budget-tracker"]')).toBeVisible()
  })
})
