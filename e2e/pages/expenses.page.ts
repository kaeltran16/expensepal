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
    await this.page.click(this.floatingActionBtn)
    await this.page.click('[data-testid="add-expense-action"]')
    await expect(this.page.locator(this.expenseForm)).toBeVisible()
  }

  async fillExpenseForm(data: { amount: number; merchant: string; category?: string }) {
    await this.page.fill(this.amountInput, data.amount.toString())
    await this.page.fill(this.merchantInput, data.merchant)

    if (data.category) {
      await this.page.click(`button:has-text("${data.category}")`)
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
    await this.swipeCard(card, 'left')
    await card.locator(this.deleteBtn).click()
    await this.page.click('button:has-text("Delete")')
    await this.waitForQuerySettle()
  }

  async editExpense(index = 0) {
    const card = this.page.locator(this.expenseCard).nth(index)
    await card.locator(this.editBtn).click()
    await expect(this.page.locator(this.expenseForm)).toBeVisible()
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
