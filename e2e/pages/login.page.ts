import { Page, expect } from '@playwright/test'
import { BasePage } from './base.page'

export class LoginPage extends BasePage {
  readonly devEmailInput = '[data-testid="dev-email-input"]'
  readonly devPasswordInput = '[data-testid="dev-password-input"]'
  readonly devLoginBtn = '[data-testid="dev-login-btn"]'
  readonly googleLoginBtn = '#google-login-btn'
  readonly loadingSpinner = '.animate-pulse'

  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.page.goto('/login')
    await this.waitForNetworkIdle()
  }

  async loginWithDevCredentials(email = 'test@test.com', password = 'test') {
    await this.page.fill(this.devEmailInput, email)
    await this.page.fill(this.devPasswordInput, password)
    await this.page.click(this.devLoginBtn)

    // Wait for redirect to home page - check that we're no longer on login
    await this.page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 })

    // Wait for the expenses heading to be visible (indicates page loaded)
    await this.page.locator('h1:has-text("Expenses")').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})

    // Dismiss onboarding modal if present
    try {
      const skipButton = this.page.locator('button:has-text("Skip")')
      await skipButton.waitFor({ state: 'visible', timeout: 3000 })
      await skipButton.click()
      // Wait for modal to fully disappear
      await this.page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 5000 })
    } catch {
      // Modal not present or already dismissed
    }

    // Extra wait to ensure modal animations complete
    await this.page.waitForTimeout(500)
  }

  async expectDevLoginFormVisible() {
    await expect(this.page.locator(this.devEmailInput)).toBeVisible()
    await expect(this.page.locator(this.devPasswordInput)).toBeVisible()
    await expect(this.page.locator(this.devLoginBtn)).toBeVisible()
  }

  async expectGoogleLoginVisible() {
    await expect(this.page.locator(this.googleLoginBtn)).toBeVisible()
  }

  async expectLoginError(message: string | RegExp) {
    await expect(this.page.locator('[data-sonner-toast]')).toContainText(message)
  }

  async isOnLoginPage() {
    return this.page.url().includes('/login')
  }
}
