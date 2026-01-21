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

        // Wait for redirect to home page - check that we're no longer on login
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 })

        // Wait for the expenses heading to be visible (indicates page loaded)
        await page.locator('h1:has-text("Expenses")').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})

        // Dismiss onboarding modal if present
        try {
          const skipButton = page.locator('button:has-text("Skip")')
          await skipButton.waitFor({ state: 'visible', timeout: 3000 })
          await skipButton.click()
          // Wait for modal to fully disappear
          await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 5000 })
        } catch {
          // Modal not present or already dismissed
        }

        // Extra wait to ensure modal animations complete
        await page.waitForTimeout(500)

        // Ensure auth cookies are set before continuing
        // Wait for network to be idle to ensure session is established
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

        // CRITICAL: Verify auth works by making a test API call
        // This ensures cookies are not just present but actually working
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            const response = await page.request.get('/api/expenses')
            const contentType = response.headers()['content-type']

            // If we get JSON, we're authenticated
            if (contentType && contentType.includes('application/json')) {
              return // Auth successful
            }

            // If we get HTML, we're not authenticated yet - wait and retry
            if (attempt < 5) {
              await page.waitForTimeout(1000 * attempt) // Exponential backoff
              continue
            }
          } catch (error) {
            if (attempt < 5) {
              await page.waitForTimeout(1000 * attempt)
              continue
            }
            throw new Error(`Auth verification failed after ${attempt} attempts: ${error}`)
          }
        }

        throw new Error('Auth cookies not working after 5 attempts')
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
