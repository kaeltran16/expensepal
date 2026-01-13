import { expect, Page, BrowserContext } from '@playwright/test'

export type OfflineHelper = {
  goOffline: () => Promise<void>
  goOnline: () => Promise<void>
  isOffline: () => Promise<boolean>
  waitForOfflineIndicator: () => Promise<void>
  waitForOnlineIndicator: () => Promise<void>
}

export function createOfflineHelper(page: Page, context: BrowserContext): OfflineHelper {
  return {
    goOffline: async () => {
      await context.setOffline(true)
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'))
      })
    },

    goOnline: async () => {
      await context.setOffline(false)
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'))
      })
    },

    isOffline: async () => {
      return await page.evaluate(() => !navigator.onLine)
    },

    waitForOfflineIndicator: async () => {
      await expect(
        page.locator("text=You're offline")
      ).toBeVisible({ timeout: 5000 })
    },

    waitForOnlineIndicator: async () => {
      await expect(
        page.locator("text=You're offline")
      ).not.toBeVisible({ timeout: 5000 })
    },
  }
}

export { expect }
