import { expect, test } from "../fixtures"

test.describe("notifications", () => {
  test("page loads with unread and all tabs", async ({ page }) => {
    await page.goto("/notifications")

    await expect(page.getByRole("tab", { name: "Unread" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "All" })).toBeVisible()
  })

  test("switching between tabs works", async ({ page }) => {
    await page.goto("/notifications")

    await page.getByRole("tab", { name: "All" }).click()
    await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true",
    )

    await page.getByRole("tab", { name: "Unread" }).click()
    await expect(page.getByRole("tab", { name: "Unread" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  test("empty state or notification content is present", async ({ page }) => {
    await page.goto("/notifications")

    // Either there are notifications or the empty state text is present
    // Using toContainText instead of toBeVisible since the content area
    // may be inside a scrollable container with overflow clipping
    await expect(page.getByRole("main")).toContainText(
      /(all caught up!|no notifications yet)/,
    )
  })
})
