import { test as base, Page, expect } from '@playwright/test'

type AnalyticsFixture = {
  waitForChartsToRender: () => Promise<void>
  expectChartVisible: (chartTestId: string) => Promise<void>
  getChartElements: (chartTestId: string) => Promise<any>
  waitForChartAnimation: () => Promise<void>
}

export const test = base.extend<{ analytics: AnalyticsFixture }>({
  analytics: async ({ page }, use) => {
    const analytics: AnalyticsFixture = {
      waitForChartsToRender: async () => {
        // Wait for Recharts to render (they use SVG)
        await page.waitForSelector('svg.recharts-surface', { timeout: 10000 })
        // Wait for animations to complete
        await page.waitForTimeout(1000)
      },

      expectChartVisible: async (chartTestId: string) => {
        const chart = page.locator(`[data-testid="${chartTestId}"]`)
        await expect(chart).toBeVisible()

        // Verify chart has SVG content (Recharts uses SVG)
        const svg = chart.locator('svg.recharts-surface')
        await expect(svg).toBeVisible()
      },

      getChartElements: async (chartTestId: string) => {
        return await page.evaluate((testId) => {
          const chartContainer = document.querySelector(`[data-testid="${testId}"]`)
          if (!chartContainer) return null

          const svg = chartContainer.querySelector('svg.recharts-surface')
          if (!svg) return null

          return {
            hasSvg: !!svg,
            width: svg.getAttribute('width'),
            height: svg.getAttribute('height'),
            hasData: svg.querySelectorAll('.recharts-bar, .recharts-line, .recharts-pie').length > 0,
          }
        }, chartTestId)
      },

      waitForChartAnimation: async () => {
        // Recharts animations typically take 400ms
        await page.waitForTimeout(500)
      },
    }

    await use(analytics)
  },
})

export { expect } from '@playwright/test'
