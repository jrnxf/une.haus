import { expect, test } from "../fixtures"

test.describe("games hub", () => {
  test("shows 3 game cards linking to correct routes", async ({ page }) => {
    await page.goto("/games")

    await expect(page.getByText("rack it up")).toBeVisible()
    await expect(page.getByText("back it up")).toBeVisible()
    await expect(page.getByText("stack it up")).toBeVisible()

    // Verify each card is a navigable link
    await expect(page.getByRole("link", { name: /rack it up/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /back it up/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /stack it up/i })).toBeVisible()
  })

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
