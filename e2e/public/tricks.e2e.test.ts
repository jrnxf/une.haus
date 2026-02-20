import { expect, test } from "../fixtures";

test.describe("tricks", () => {
  test("table loads with rows", async ({ page }) => {
    await page.goto("/tricks");

    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row").nth(1)).toBeVisible();
  });

  test("clicking a trick navigates to detail page", async ({ page }) => {
    await page.goto("/tricks");

    // First data row's link
    const firstTrickLink = page.getByRole("row").nth(1).getByRole("link");
    const isVisible = await firstTrickLink.isVisible().catch(() => false);
    test.skip(!isVisible, "No tricks available");

    await firstTrickLink.click();
    await expect(page).toHaveURL(/\/tricks\/.+/);
  });
});
