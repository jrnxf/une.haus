import { expect, test } from "../fixtures"

test("feedback form loads with fields", async ({ page }) => {
  await page.goto("/feedback")

  await expect(page.getByLabel("message")).toBeVisible()
  await expect(page.getByLabel("none")).toBeVisible()
  await expect(page.getByLabel("image")).toBeVisible()
  await expect(page.getByLabel("video")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "submit", exact: true }),
  ).toBeVisible()
})
