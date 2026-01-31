import { Page, expect } from '@playwright/test'
import { waitForQueryToSettle } from '../helpers/wait-for-query'

export class BasePage {
  constructor(protected page: Page) {}

  async navigateTo(view: 'expenses' | 'budget' | 'insights' | 'workouts' | 'calories' | 'recurring' | 'profile') {
    // Views directly on bottom nav
    const directNavViews = ['expenses', 'workouts', 'insights']

    // Views accessed via "More" sheet
    const moreSheetViews = ['budget', 'calories', 'recurring', 'profile']

    if (directNavViews.includes(view)) {
      await this.page.click(`[data-testid="nav-${view}"]`)
    } else if (moreSheetViews.includes(view)) {
      // Open More sheet
      await this.page.click('[data-testid="nav-more"]')
      await this.page.waitForTimeout(300) // Wait for sheet animation

      // Click the view in the More sheet
      await this.page.click(`button:has-text("${view.charAt(0).toUpperCase() + view.slice(1)}")`)
    }

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
