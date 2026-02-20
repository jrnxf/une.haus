import { expect, test } from "../fixtures";

test.describe("users", () => {
  test("users list loads with user cards", async ({ page }) => {
    await page.goto("/users");

    // Should show user cards or empty state
    await expect(
      page
        .getByRole("main")
        .locator("a")
        .first()
        .or(page.getByText("no users")),
    ).toBeVisible();
  });

  test("clicking a user card navigates to profile", async ({ page }) => {
    await page.goto("/users");

    const userCard = page.getByRole("main").locator("a").first();
    const isVisible = await userCard.isVisible().catch(() => false);
    test.skip(!isVisible, "No users available");

    await userCard.click();
    await expect(page).toHaveURL(/\/users\/\d+/);
  });
});
