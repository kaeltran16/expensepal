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
  readonly budgetTracker = '[data-testid="budget-tracker"]'
  readonly aiRecommendations = '[data-testid="ai-recommendations"]'
  readonly budgetPredictions = '[data-testid="budget-predictions"]'

  constructor(page: Page) {
    super(page)
  }

  async goto() {
    // First go to home page
    await this.page.goto('/')
    await this.waitForQuerySettle()

    // Wait for navigation to be ready
    await this.page.locator('[data-testid="nav-more"]').waitFor({ state: 'visible', timeout: 10000 })

    // Navigate to budget via More sheet
    await this.page.click('[data-testid="nav-more"]')

    // Wait for the More sheet to be visible (it slides up from bottom)
    // The sheet contains buttons with text like "Budget", "Calories", etc.
    await this.page.waitForTimeout(500) // Animation time

    // Click Budget option - look for the specific button with "Budget" label
    // The button has structure: icon + label "Budget" + description + chevron
    const budgetOption = this.page.locator('button').filter({ hasText: 'Budget' }).filter({ hasText: 'Manage spending' })
    await budgetOption.waitFor({ state: 'visible', timeout: 5000 })
    await budgetOption.click()

    await this.waitForQuerySettle()

    // Wait for budget tracker to be visible
    await this.page.locator(this.budgetTracker).waitFor({ state: 'visible', timeout: 15000 })
  }

  async openSetBudgetDialog(category: string) {
    // Find the budget card for this category and click its set budget button
    const card = this.page.locator(`${this.budgetCard}:has-text("${category}")`)
    await card.waitFor({ state: 'visible', timeout: 5000 })
    const btn = card.locator(this.setBudgetBtn)
    await btn.click()
    await expect(this.page.locator(this.budgetDialog)).toBeVisible({ timeout: 5000 })
  }

  async setBudget(category: string, amount: number) {
    await this.openSetBudgetDialog(category)
    await this.page.fill(this.budgetAmountInput, amount.toString())
    await this.page.click(this.saveBudgetBtn)
    await this.waitForQuerySettle()
  }

  async updateBudget(category: string, newAmount: number) {
    await this.openSetBudgetDialog(category)
    await this.page.fill(this.budgetAmountInput, '')
    await this.page.fill(this.budgetAmountInput, newAmount.toString())
    // If a budget exists, the button shows "Update Budget" instead of "Set Budget"
    const updateBtn = this.page.locator(this.updateBudgetBtn)
    const setBtn = this.page.locator(this.saveBudgetBtn)
    if (await updateBtn.isVisible()) {
      await updateBtn.click()
    } else {
      await setBtn.click()
    }
    await this.waitForQuerySettle()
  }

  async navigateToRecurring() {
    // Navigate to recurring view via More sheet
    await this.page.click('[data-testid="nav-more"]')
    await this.page.waitForTimeout(300)
    await this.page.click('button:has-text("Recurring")')
    await this.waitForQuerySettle()
  }

  async navigateToBudget() {
    // Navigate back to budget view via More sheet
    await this.page.click('[data-testid="nav-more"]')
    await this.page.waitForTimeout(300)
    await this.page.click('button:has-text("Budget")')
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
