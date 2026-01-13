import { test as base, expect } from '@playwright/test'

const DEV_EMAIL = 'test@test.com'
const DEV_PASSWORD = 'test'

type AuthFixture = {
  login: () => Promise<void>
  logout: () => Promise<void>
  isLoggedIn: () => Promise<boolean>
}

export const test = base.extend<{ auth: AuthFixture }>({
  auth: async ({ page }, use) => {
    const auth: AuthFixture = {
      login: async () => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle')

        await page.locator('[data-testid="dev-email-input"]').fill(DEV_EMAIL)
        await page.locator('[data-testid="dev-password-input"]').fill(DEV_PASSWORD)
        await page.locator('[data-testid="dev-login-btn"]').click()

        await page.waitForURL('/')
      },

      logout: async () => {
        await page.click('[data-testid="user-menu-trigger"]')
        await page.click('[data-testid="logout-btn"]')
        await page.waitForURL('/login')
      },

      isLoggedIn: async () => {
        return !page.url().includes('/login')
      },
    }

    await use(auth)
  },
})

export { expect }
