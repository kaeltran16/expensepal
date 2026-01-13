import { test, expect } from '../../fixtures'
import { ExpensesPage } from '../../pages/expenses.page'

test.describe('Expense CRUD', () => {
  let expensesPage: ExpensesPage

  test.beforeEach(async ({ page, auth, api }) => {
    await auth.login()
    await api.deleteAllExpenses()
    expensesPage = new ExpensesPage(page)
    await expensesPage.goto()
  })

  test('should display empty state when no expenses', async () => {
    await expensesPage.expectEmptyState()
    await expensesPage.expectQuickStatsVisible()
  })

  test('should create a new expense via form', async ({ toast }) => {
    await expensesPage.createExpense({
      amount: 50000,
      merchant: 'Test Coffee Shop',
      category: 'Food',
    })

    await toast.checkToast('Expense added', 'success')
    await expensesPage.expectExpenseVisible('Test Coffee Shop')
    await expensesPage.expectExpenseCount(1)
  })

  test('should edit an existing expense', async ({ api, page }) => {
    await api.seedExpense({
      amount: 30000,
      merchant: 'Original Merchant',
      category: 'Transport',
    })

    await page.reload()
    await expensesPage.waitForQuerySettle()

    await expensesPage.editExpense(0)
    await page.fill('input[name="merchant"]', 'Updated Merchant')
    await page.click('button[type="submit"]')

    await expensesPage.waitForQuerySettle()
    await expensesPage.expectExpenseVisible('Updated Merchant')
    await expensesPage.expectExpenseNotVisible('Original Merchant')
  })

  test('should delete an expense with confirmation', async ({ api, page, toast }) => {
    await api.seedExpense({
      amount: 25000,
      merchant: 'Expense To Delete',
      category: 'Shopping',
    })

    await page.reload()
    await expensesPage.waitForQuerySettle()

    await expensesPage.deleteExpense(0)

    await toast.checkToast('deleted', 'success')
    await expensesPage.expectExpenseNotVisible('Expense To Delete')
  })

  test('should filter expenses by search query', async ({ api, page }) => {
    await api.seedExpense({ merchant: 'Coffee Shop', category: 'Food', amount: 30000 })
    await api.seedExpense({ merchant: 'Gas Station', category: 'Transport', amount: 500000 })
    await api.seedExpense({ merchant: 'Grocery Store', category: 'Food', amount: 200000 })

    await page.reload()
    await expensesPage.waitForQuerySettle()

    await expensesPage.searchExpenses('Coffee')

    await expensesPage.expectExpenseVisible('Coffee Shop')
    await expensesPage.expectExpenseNotVisible('Gas Station')
    await expensesPage.expectExpenseNotVisible('Grocery Store')
  })

  test('should show expenses sorted by date (newest first)', async ({ api, page }) => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await api.seedExpense({
      merchant: 'Yesterday Expense',
      amount: 10000,
      transaction_date: yesterday.toISOString(),
    })

    await api.seedExpense({
      merchant: 'Today Expense',
      amount: 20000,
      transaction_date: new Date().toISOString(),
    })

    await page.reload()
    await expensesPage.waitForQuerySettle()

    const firstCard = page.locator('[data-testid="expense-card"]').first()
    await expect(firstCard).toContainText('Today Expense')
  })

  test('should update quick stats after adding expense', async ({ page }) => {
    const statsBeforeText = await page.locator('[data-testid="today-total"]').textContent()

    await expensesPage.createExpense({
      amount: 100000,
      merchant: 'New Expense',
      category: 'Food',
    })

    await page.waitForTimeout(500)
    const statsAfterText = await page.locator('[data-testid="today-total"]').textContent()

    expect(statsAfterText).not.toBe(statsBeforeText)
  })

  test('should persist expense after page reload', async ({ api, page }) => {
    await expensesPage.createExpense({
      amount: 75000,
      merchant: 'Persistent Expense',
      category: 'Bills',
    })

    await page.reload()
    await expensesPage.waitForQuerySettle()

    await expensesPage.expectExpenseVisible('Persistent Expense')
  })
})
