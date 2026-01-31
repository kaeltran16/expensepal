import { Page, expect, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class ExpensesPage extends BasePage {
  readonly expenseCard = '[data-testid="expense-card"]'
  readonly navAddBtn = '[data-testid="nav-add"]'
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
    // Wait for either the expense list or empty state to be visible
    await Promise.race([
      this.page.locator(this.emptyState).waitFor({ state: 'visible', timeout: 10000 }),
      this.page.locator(this.expenseCard).first().waitFor({ state: 'visible', timeout: 10000 }),
      this.page.locator('[data-testid="quick-stats"]').waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => {
      // One of these should be visible after loading completes
    })
  }

  async openAddExpenseForm() {
    // Click the center "add" button on bottom navigation
    await this.page.locator(this.navAddBtn).click()

    // Wait for form to be visible
    await expect(this.page.locator(this.expenseForm)).toBeVisible({ timeout: 5000 })

    // Extra wait for form animations
    await this.page.waitForTimeout(300)
  }

  async fillExpenseForm(data: { amount: number; merchant: string; category?: string }) {
    // Wait for form to be fully loaded and stable
    await this.page.waitForTimeout(500)

    // Clear and fill amount
    const amountField = this.page.locator(this.amountInput)
    await amountField.clear()
    await amountField.fill(data.amount.toString())

    // Clear and fill merchant
    const merchantField = this.page.locator(this.merchantInput)
    await merchantField.clear()
    await merchantField.fill(data.merchant)

    if (data.category) {
      // Wait for category buttons to load
      await this.page.waitForTimeout(300)

      // Category buttons have format: "🍔 Food" - icon followed by name
      // Look for a button within the form that contains the category text
      const formLocator = this.page.locator(this.expenseForm)
      // Use a regex to match the category name with any preceding emoji/icon
      const categoryBtn = formLocator.locator(`button`, { hasText: new RegExp(data.category, 'i') }).first()
      await categoryBtn.waitFor({ state: 'visible', timeout: 5000 })
      await categoryBtn.click()
      await this.page.waitForTimeout(100)
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

  async expandExpenseCard(index = 0) {
    const card = this.page.locator(this.expenseCard).nth(index)

    // Wait for card to be visible
    await card.waitFor({ state: 'visible', timeout: 5000 })

    // Click the card to expand it (cards are expandable)
    await card.click()

    // Wait for expansion animation
    await this.page.waitForTimeout(400)
  }

  async deleteExpense(index = 0) {
    // First expand the card to reveal actions
    await this.expandExpenseCard(index)

    const card = this.page.locator(this.expenseCard).nth(index)

    // Click delete button (visible after card is expanded)
    const deleteBtn = card.locator(this.deleteBtn)
    await deleteBtn.waitFor({ state: 'visible', timeout: 5000 })
    await deleteBtn.click()

    // Wait for confirmation dialog and click delete
    const confirmBtn = this.page.locator('[role="alertdialog"] button:has-text("Delete")')
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 })
    await confirmBtn.click()

    await this.waitForQuerySettle()
  }

  async editExpense(index = 0) {
    // First expand the card to reveal actions
    await this.expandExpenseCard(index)

    const card = this.page.locator(this.expenseCard).nth(index)

    // Click edit button (visible after card is expanded)
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
    await expect(this.page.locator(`${this.expenseCard}:has-text("${merchant}")`).first()).toBeVisible({ timeout: 10000 })
  }

  async expectExpenseNotVisible(merchant: string) {
    await expect(this.page.locator(`${this.expenseCard}:has-text("${merchant}")`)).toHaveCount(0)
  }

  async expectEmptyState() {
    await expect(this.page.locator(this.emptyState)).toBeVisible({ timeout: 10000 })
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
