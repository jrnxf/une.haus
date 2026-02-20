import { test as base, expect } from "@playwright/test";

/**
 * Extended test fixture that waits for React hydration after every page.goto().
 *
 * SSR-rendered elements pass Playwright's actionability checks before React
 * attaches event handlers. This fixture ensures the app is interactive before
 * any test interaction runs.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await originalGoto(url, options);
      await expect(page.locator("html[data-hydrated]")).toBeAttached();
      return response;
    };
    await use(page);
  },
});

export { expect };
