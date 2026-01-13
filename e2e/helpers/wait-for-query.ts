import { Page, expect } from '@playwright/test'

/**
 * Wait for React Query to settle (no pending queries)
 */
export async function waitForQueryToSettle(page: Page, timeout = 10000) {
  // Wait for loading indicators to disappear
  await expect(page.locator('[data-loading="true"]')).toHaveCount(0, { timeout })

  // Wait for skeleton loaders to disappear
  await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout })

  // Additional network idle check
  await page.waitForLoadState('networkidle', { timeout })
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
