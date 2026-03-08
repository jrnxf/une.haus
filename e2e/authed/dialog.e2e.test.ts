import { expect, test } from "../fixtures"

test.describe("dialog", () => {
  test("clicking the overlay closes the dialog", async ({ page }) => {
    await page.goto("/sandbox")

    await page
      .getByText(/^dialog$/)
      .locator("xpath=..")
      .getByRole("button", { name: "Open" })
      .click()

    await expect(page.getByRole("dialog")).toBeVisible()

    await page.mouse.click(8, 8)

    await expect(page.getByRole("dialog")).not.toBeVisible()
  })
})
