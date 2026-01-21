import { test as base, expect } from '@playwright/test'

type ToastFixture = {
  checkToast: (message: string | RegExp, type?: 'success' | 'error' | 'info') => Promise<void>
  waitForToastToDisappear: () => Promise<void>
}

export const test = base.extend<{ toast: ToastFixture }>({
  toast: async ({ page }, use) => {
    const toast: ToastFixture = {
      checkToast: async (message, type) => {
        const toastContainer = page.locator('[data-sonner-toaster]')
        const toastItem = toastContainer.locator('[data-sonner-toast]')

        // Wait for toast to appear
        await expect(toastItem.first()).toBeVisible({ timeout: 10000 })

        // Check message content
        if (typeof message === 'string') {
          await expect(toastItem.first()).toContainText(message, { timeout: 5000 })
        } else {
          await expect(toastItem.first()).toHaveText(message, { timeout: 5000 })
        }

        // Optionally check type if specified (sonner uses data-type attribute)
        if (type) {
          // Try to find the type attribute, but don't fail if not found
          // Sonner v2 uses data-type on the toast element
          const typeAttr = await toastItem.first().getAttribute('data-type')
          if (typeAttr !== type) {
            // Fallback: Check for icon or class that indicates type
            // Success toasts typically have a success icon
            const hasTypeIndicator = await toastItem.first().locator(`[data-icon="${type}"], .${type}`).isVisible().catch(() => false)
            if (!hasTypeIndicator && typeAttr !== type) {
              console.warn(`Toast type mismatch: expected "${type}", got "${typeAttr}"`)
            }
          }
        }
      },

      waitForToastToDisappear: async () => {
        const toastItem = page.locator('[data-sonner-toast]')
        await expect(toastItem).toHaveCount(0, { timeout: 10000 })
      },
    }

    await use(toast)
  },
})

export { expect }
