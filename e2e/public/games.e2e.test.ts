import { expect, test } from "../fixtures"

test.describe("games hub", () => {
  test("Rack It Up card navigates to active RIU", async ({ page }) => {
    await page.goto("/games")
    await page.getByRole("link", { name: /rack it up/i }).click()
    await expect(page).toHaveURL("/games/rius/active")
  })
})

test.describe("chain games", () => {
  test("Back It Up page loads", async ({ page }) => {
    await page.goto("/games/bius")
    // bius redirects to the first active chain (e.g. /games/bius/4)
    await expect(page).toHaveURL(/\/games\/bius/)
  })

  test("Stack It Up page loads", async ({ page }) => {
    await page.goto("/games/sius")
    // sius redirects to the first active chain (e.g. /games/sius/4)
    await expect(page).toHaveURL(/\/games\/sius/)
  })
})
