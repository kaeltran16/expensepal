import { expect, test } from '../../fixtures'
import { LoginPage } from '../../pages/login.page'

test.describe('Auth Flow', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
  })

  test('should display login page for unauthenticated users', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
    await loginPage.expectGoogleLoginVisible()
    await loginPage.expectDevLoginFormVisible()
  })

  test('should show dev login form in development mode', async () => {
    await loginPage.goto()
    await loginPage.expectDevLoginFormVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginPage.goto()
    await loginPage.loginWithDevCredentials()

    await expect(page).toHaveURL('/')
    // Verify we're logged in by checking for the expenses page heading
    await expect(page.locator('h1:has-text("Expenses")')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await loginPage.goto()

    await page.fill('[data-testid="dev-email-input"]', 'wrong@test.com')
    await page.fill('[data-testid="dev-password-input"]', 'wrongpassword')
    await page.click('[data-testid="dev-login-btn"]')

    await loginPage.expectLoginError(/Login failed|Invalid/i)
    expect(await loginPage.isOnLoginPage()).toBe(true)
  })

  test('should logout successfully', async ({ page, auth }) => {
    await auth.login()
    await auth.logout()
    await expect(page).toHaveURL('/login')
  })

  test('should protect routes when not authenticated', async ({ page }) => {
    await page.goto('/?view=budget')
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/?view=insights')
    await expect(page).toHaveURL(/\/login/)
  })
})
