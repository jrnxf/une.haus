import { expect, test } from "../fixtures";

test.describe("tricks", () => {
  test("table loads with rows", async ({ page }) => {
    await page.goto("/tricks");

    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("table").locator("tbody tr").first(),
    ).toBeVisible();
  });

  test("clicking a trick navigates to detail page", async ({ page }) => {
    await page.goto("/tricks");

    const firstTrickLink = page
      .getByRole("table")
      .locator("tbody tr a")
      .first();
    const isVisible = await firstTrickLink.isVisible().catch(() => false);
    test.skip(!isVisible, "No tricks available");

    await firstTrickLink.click();
    await expect(page).toHaveURL(/\/tricks\/.+/);
  });
});
