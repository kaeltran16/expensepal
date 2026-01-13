import { Page, expect } from '@playwright/test'
import { waitForQueryToSettle } from '../helpers/wait-for-query'

export class BasePage {
  constructor(protected page: Page) {}

  async navigateTo(view: 'expenses' | 'budget' | 'insights' | 'goals') {
    const viewMap = {
      expenses: '[data-testid="nav-expenses"]',
      budget: '[data-testid="nav-budget"]',
      insights: '[data-testid="nav-insights"]',
      goals: '[data-testid="nav-goals"]',
    }

    await this.page.click(viewMap[view])
    await waitForQueryToSettle(this.page)
  }

  async navigateToUrl(path: string) {
    await this.page.goto(path)
    await waitForQueryToSettle(this.page)
  }

  async expectUrl(path: string) {
    await expect(this.page).toHaveURL(path)
  }

  async expectUrlContains(substring: string) {
    expect(this.page.url()).toContain(substring)
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle')
  }

  async waitForQuerySettle() {
    await waitForQueryToSettle(this.page)
  }
}
