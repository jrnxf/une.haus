import { expect, test } from "../fixtures";

test.describe("map", () => {
  test("map page loads", async ({ page }) => {
    await page.goto("/map");
    await expect(page).toHaveURL("/map");
  });
});
