import { Page, expect, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class ExpensesPage extends BasePage {
  readonly expenseCard = '[data-testid="expense-card"]'
  readonly addExpenseBtn = '[data-testid="add-expense-btn"]'
  readonly floatingActionBtn = '[data-testid="fab-menu"]'
  readonly expenseForm = '[data-testid="expense-form"]'
  readonly amountInput = 'input[name="amount"]'
  readonly merchantInput = 'input[name="merchant"]'
  readonly submitBtn = 'button[type="submit"]'
  readonly deleteBtn = '[data-testid="delete-expense"]'
  readonly editBtn = '[data-testid="edit-expense"]'
  readonly searchBar = '[data-testid="search-bar"]'
  readonly filterBtn = '[data-testid="filter-btn"]'
  readonly emptyState = '[data-testid="empty-expenses"]'
  readonly quickStatsOverview = '[data-testid="quick-stats"]'

  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.page.goto('/')
    await this.waitForQuerySettle()
  }

  async openAddExpenseForm() {
    // Click the floating action button
    await this.page.locator(this.floatingActionBtn).click()

    // Wait for menu to appear and stabilize
    await this.page.waitForTimeout(200)

    // Click the add expense action
    const addExpenseAction = this.page.locator('[data-testid="add-expense-action"]')
    await addExpenseAction.waitFor({ state: 'visible', timeout: 5000 })
    await addExpenseAction.click()

    // Wait for form to be visible
    await expect(this.page.locator(this.expenseForm)).toBeVisible({ timeout: 5000 })

    // Extra wait for form animations
    await this.page.waitForTimeout(300)
  }

  async fillExpenseForm(data: { amount: number; merchant: string; category?: string }) {
    // Wait for form to be fully loaded and stable
    await this.page.waitForTimeout(300)

    await this.page.fill(this.amountInput, data.amount.toString())
    await this.page.fill(this.merchantInput, data.merchant)

    if (data.category) {
      // Wait for category button to be clickable
      const categoryBtn = this.page.locator(`button:has-text("${data.category}")`).first()
      await categoryBtn.waitFor({ state: 'visible', timeout: 5000 })
      // Use force click to avoid interception issues
      await categoryBtn.click({ force: true })
    }
  }

  async submitExpenseForm() {
    await this.page.click(this.submitBtn)
    await this.waitForQuerySettle()
  }

  async createExpense(data: { amount: number; merchant: string; category?: string }) {
    await this.openAddExpenseForm()
    await this.fillExpenseForm(data)
    await this.submitExpenseForm()
  }

  async deleteExpense(index = 0) {
    const card = this.page.locator(this.expenseCard).nth(index)

    // Wait for card to be visible
    await card.waitFor({ state: 'visible', timeout: 5000 })

    // Click delete button (always visible in the card)
    const deleteBtn = card.locator(this.deleteBtn)
    await deleteBtn.waitFor({ state: 'visible', timeout: 5000 })
    await deleteBtn.click()

    // Wait for confirmation dialog and click delete
    const confirmBtn = this.page.locator('button:has-text("Delete")')
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 })
    await confirmBtn.click()

    await this.waitForQuerySettle()
  }

  async editExpense(index = 0) {
    const card = this.page.locator(this.expenseCard).nth(index)

    // Wait for card to be visible
    await card.waitFor({ state: 'visible', timeout: 5000 })

    // Click edit button (always visible in the card)
    const editBtn = card.locator(this.editBtn)
    await editBtn.waitFor({ state: 'visible', timeout: 5000 })
    await editBtn.click()

    // Wait for form to appear
    await expect(this.page.locator(this.expenseForm)).toBeVisible({ timeout: 5000 })

    // Extra wait for form animations
    await this.page.waitForTimeout(300)
  }

  async searchExpenses(query: string) {
    await this.page.fill(this.searchBar, query)
    await this.page.waitForTimeout(500)
    await this.waitForQuerySettle()
  }

  async swipeCard(card: Locator, direction: 'left' | 'right') {
    const box = await card.boundingBox()
    if (!box) return

    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2
    const endX = direction === 'left' ? startX - 150 : startX + 150

    await this.page.mouse.move(startX, startY)
    await this.page.mouse.down()
    await this.page.mouse.move(endX, startY, { steps: 10 })
    await this.page.mouse.up()
  }

  async expectExpenseCount(count: number) {
    await expect(this.page.locator(this.expenseCard)).toHaveCount(count)
  }

  async expectExpenseVisible(merchant: string) {
    await expect(this.page.locator(`${this.expenseCard}:has-text("${merchant}")`)).toBeVisible()
  }

  async expectExpenseNotVisible(merchant: string) {
    await expect(this.page.locator(`${this.expenseCard}:has-text("${merchant}")`)).not.toBeVisible()
  }

  async expectEmptyState() {
    await expect(this.page.locator(this.emptyState)).toBeVisible()
  }

  async expectQuickStatsVisible() {
    await expect(this.page.locator(this.quickStatsOverview)).toBeVisible()
  }

  async getExpenseAmount(index = 0) {
    const card = this.page.locator(this.expenseCard).nth(index)
    const amountText = await card.locator('[data-testid="expense-amount"]').textContent()
    return amountText
  }
}
