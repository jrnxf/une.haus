import { expect, test } from "../fixtures"

test.describe("tournament", () => {
  test("tournament list loads", async ({ page }) => {
    await page.goto("/tourney")

    // Should show tournament links (actual <a> tags, not breadcrumb spans) or empty state
    await expect(
      page
        .getByRole("main")
        .locator("a")
        .first()
        .or(page.getByText("no tournaments")),
    ).toBeVisible()
  })
})
