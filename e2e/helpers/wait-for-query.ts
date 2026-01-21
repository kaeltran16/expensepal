import { Page, expect } from '@playwright/test'

/**
 * Wait for React Query to settle (no pending queries)
 */
export async function waitForQueryToSettle(page: Page, timeout = 10000) {
  // Wait for loading indicators to disappear
  await expect(page.locator('[data-loading="true"]')).toHaveCount(0, { timeout }).catch(() => {
    // If loading indicators persist, continue anyway
  })

  // Wait for skeleton loaders to disappear - but don't fail if they persist
  // Some components might have persistent animations
  try {
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 5000 })
  } catch {
    // Skeleton loaders might be from non-loading UI elements, ignore
  }

  // Additional network idle check
  await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {
    // Network idle might not be reached if there are long-polling requests
  })
}

/**
 * Wait for specific data to appear
 */
export async function waitForDataLoad(
  page: Page,
  selector: string,
  minCount = 1,
  timeout = 10000
) {
  await expect(page.locator(selector)).toHaveCount(minCount, { timeout })
}
