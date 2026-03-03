import { expect, test } from "../fixtures"

test.describe("feedback", () => {
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

  test("submit requires message content", async ({ page }) => {
    await page.goto("/feedback")

    // Try submitting without filling in the message
    await page.getByRole("button", { name: "submit", exact: true }).click()

    // Should stay on the feedback page (form validation prevents submit)
    await expect(page).toHaveURL("/feedback")
  })
})
