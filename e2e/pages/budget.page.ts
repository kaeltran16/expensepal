import { Page, expect } from '@playwright/test'
import { BasePage } from './base.page'

export class BudgetPage extends BasePage {
  readonly budgetCard = '[data-testid="budget-card"]'
  readonly setBudgetBtn = '[data-testid="set-budget-btn"]'
  readonly budgetDialog = '[data-testid="budget-dialog"]'
  readonly budgetAmountInput = '#budget-amount'
  readonly saveBudgetBtn = 'button:has-text("Set Budget")'
  readonly updateBudgetBtn = 'button:has-text("Update Budget")'
  readonly budgetProgress = '[data-testid="budget-progress"]'
  readonly tabBudgets = 'button:has-text("Budgets")'
  readonly tabRecurring = 'button:has-text("Recurring")'
  readonly aiRecommendations = '[data-testid="ai-recommendations"]'
  readonly budgetPredictions = '[data-testid="budget-predictions"]'

  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.page.goto('/?view=budget')
    await this.waitForQuerySettle()
  }

  async openSetBudgetDialog(category: string) {
    await this.page.click(`${this.budgetCard}:has-text("${category}") ${this.setBudgetBtn}`)
    await expect(this.page.locator(this.budgetDialog)).toBeVisible()
  }

  async setBudget(category: string, amount: number) {
    await this.openSetBudgetDialog(category)
    await this.page.fill(this.budgetAmountInput, amount.toString())
    await this.page.click(this.saveBudgetBtn)
    await this.waitForQuerySettle()
  }

  async updateBudget(category: string, newAmount: number) {
    await this.openSetBudgetDialog(category)
    await this.page.fill(this.budgetAmountInput, newAmount.toString())
    await this.page.click(this.updateBudgetBtn)
    await this.waitForQuerySettle()
  }

  async switchToRecurringTab() {
    await this.page.click(this.tabRecurring)
    await this.waitForQuerySettle()
  }

  async switchToBudgetsTab() {
    await this.page.click(this.tabBudgets)
    await this.waitForQuerySettle()
  }

  async expectBudgetCount(count: number) {
    await expect(this.page.locator(this.budgetCard)).toHaveCount(count)
  }

  async expectBudgetVisible(category: string) {
    await expect(
      this.page.locator(`${this.budgetCard}:has-text("${category}")`)
    ).toBeVisible()
  }

  async expectBudgetAmount(category: string, amount: string) {
    const card = this.page.locator(`${this.budgetCard}:has-text("${category}")`)
    await expect(card).toContainText(amount)
  }

  async expectBudgetProgressPercent(category: string, percent: number, tolerance = 5) {
    const card = this.page.locator(`${this.budgetCard}:has-text("${category}")`)
    const progressText = await card.locator(this.budgetProgress).textContent()
    const actualPercent = parseInt(progressText?.replace('%', '') || '0')
    expect(actualPercent).toBeGreaterThanOrEqual(percent - tolerance)
    expect(actualPercent).toBeLessThanOrEqual(percent + tolerance)
  }

  async expectAIRecommendationsVisible() {
    await expect(this.page.locator(this.aiRecommendations)).toBeVisible()
  }

  async expectPredictionsVisible() {
    await expect(this.page.locator(this.budgetPredictions)).toBeVisible()
  }

  async expectOverBudgetWarning(category: string) {
    const card = this.page.locator(`${this.budgetCard}:has-text("${category}")`)
    await expect(card.locator('[data-testid="over-budget-warning"]')).toBeVisible()
  }
}
