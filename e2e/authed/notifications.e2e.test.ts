import { expect, test } from "../fixtures"

test("notifications page loads", async ({ page }) => {
  await page.goto("/notifications")
  await expect(page.getByRole("tab", { name: "Unread" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "All" })).toBeVisible()
})
