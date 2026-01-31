import { Page, expect } from '@playwright/test'

/**
 * Wait for React Query to settle (no pending queries)
 */
export async function waitForQueryToSettle(page: Page, timeout = 15000) {
  // Wait for page to be ready
  await page.waitForLoadState('domcontentloaded')

  // Wait for skeleton loaders to disappear (these indicate data is loading)
  // The skeleton cards have the animate-pulse class
  try {
    // Wait up to the timeout for skeletons to disappear
    await page.waitForFunction(() => {
      const skeletons = document.querySelectorAll('.animate-pulse')
      // Ignore small pulse elements (like notification badges)
      return Array.from(skeletons).filter(el => {
        const rect = el.getBoundingClientRect()
        return rect.width > 50 && rect.height > 20
      }).length === 0
    }, { timeout })
  } catch {
    // If skeletons persist, continue anyway
  }

  // Wait for loading indicators to disappear
  await expect(page.locator('[data-loading="true"]')).toHaveCount(0, { timeout: 5000 }).catch(() => {
    // If loading indicators persist, continue anyway
  })

  // Brief pause to allow React to finish rendering
  await page.waitForTimeout(300)
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
