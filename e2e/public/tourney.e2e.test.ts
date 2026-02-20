import { expect, test } from "../fixtures";

test.describe("tournament", () => {
  test("tournament list loads", async ({ page }) => {
    await page.goto("/tourney");

    // Should show tournaments or empty state
    await expect(
      page
        .getByRole("main")
        .getByRole("link")
        .first()
        .or(page.getByText("no tournaments")),
    ).toBeVisible();
  });
});
