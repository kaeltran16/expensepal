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
    await this.page.waitForURL('/')
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
