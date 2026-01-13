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

        await expect(toastItem.first()).toBeVisible({ timeout: 5000 })

        if (typeof message === 'string') {
          await expect(toastItem.first()).toContainText(message)
        } else {
          await expect(toastItem.first()).toHaveText(message)
        }

        if (type === 'success') {
          await expect(toastItem.first().locator('[data-type="success"]')).toBeVisible()
        } else if (type === 'error') {
          await expect(toastItem.first().locator('[data-type="error"]')).toBeVisible()
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
