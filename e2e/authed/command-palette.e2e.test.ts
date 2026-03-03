import { type Page } from "@playwright/test"

import { expect, test } from "../fixtures"

// Helper: open the command palette via the sidebar search button
async function openSearch(page: Page) {
  await page.getByRole("button", { name: /search/i }).click()
  await page.getByPlaceholder("search for anything...").waitFor()
}

test.describe("command palette", () => {
  test("opens via search button and Escape closes", async ({ page }) => {
    await page.goto("/")

    await openSearch(page)
    await expect(page.getByPlaceholder("search for anything...")).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(
      page.getByPlaceholder("search for anything..."),
    ).not.toBeVisible()
  })

  test("typing a page name and pressing Enter navigates", async ({ page }) => {
    await page.goto("/")

    await openSearch(page)
    const searchInput = page.getByPlaceholder("search for anything...")
    await searchInput.fill("Posts")

    // Wait for search result option to appear (not sidebar text)
    await page.getByRole("option", { name: "Posts" }).waitFor()

    await page.keyboard.press("Enter")

    await expect(page).toHaveURL("/posts")
  })

  test("Games opens arcade-menu, selecting Rack It Up navigates", async ({
    page,
  }) => {
    await page.goto("/")

    await openSearch(page)
    await page.getByPlaceholder("search for anything...").fill("Games")
    await page.getByRole("option", { name: "Games" }).waitFor()
    await page.keyboard.press("Enter")

    // Should be on the arcade-menu sub-page
    await expect(page.getByText("Rack It Up")).toBeVisible()
    await page.getByText("Rack It Up").click()

    await expect(page).toHaveURL("/games/rius/active")
  })

  test("Backspace on empty input goes back a sub-page", async ({ page }) => {
    await page.goto("/")

    await openSearch(page)
    await page.getByPlaceholder("search for anything...").fill("Games")
    await page.getByRole("option", { name: "Games" }).waitFor()

    // Open the actions dropdown and click "search" to push into arcade-menu
    // (Meta+S is intercepted by Chromium in headless mode)
    const actionsButton = page.getByRole("button", { name: /actions/i })
    await actionsButton.waitFor()
    await actionsButton.click()
    await page.getByRole("menuitem", { name: /search/i }).click()

    // Now on arcade-menu sub-page
    await expect(page.getByText("rack it up")).toBeVisible()

    // Backspace on empty input should go back to root
    await page.keyboard.press("Backspace")
    await expect(page.getByPlaceholder("search for anything...")).toBeVisible()
    await expect(page.getByText("Pages")).toBeVisible()
  })
})
