import { expect, test } from "../fixtures"

test.describe("map", () => {
  test("map page loads", async ({ page }) => {
    await page.goto("/map")

    // Verify the page rendered meaningful content beyond just the URL
    await expect(page.getByRole("main")).toBeVisible()
  })
})
