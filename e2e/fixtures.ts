import { test as base, expect, type Page } from "@playwright/test"

/** Wrap a page's goto to wait for React hydration after each navigation. */
function withHydrationWait(page: Page) {
  const originalGoto = page.goto.bind(page)
  page.goto = async (url, options) => {
    const response = await originalGoto(url, options)
    await expect(page.locator("html[data-hydrated]")).toBeAttached()
    return response
  }
  return page
}

/**
 * Extended test fixture that waits for React hydration after every page.goto().
 *
 * SSR-rendered elements pass Playwright's actionability checks before React
 * attaches event handlers. This fixture ensures the app is interactive before
 * any test interaction runs.
 *
 * - `page` — admin user (colby), authenticated via e2e/.auth/admin.json
 * - `userPage` — normal user (beau), authenticated via e2e/.auth/user.json
 *   Only created when a test destructures it (lazy fixture).
 */
export const test = base.extend<{ userPage: Page }>({
  page: async ({ page }, use) => {
    withHydrationWait(page)
    await use(page)
  },

  userPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    })
    const page = withHydrationWait(await context.newPage())
    await use(page)
    await context.close()
  },
})

export { expect }
