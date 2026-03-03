import postgres from "postgres"

import { expect, test } from "../fixtures"

const TEST_BIO = "e2e-bio-test"

test.describe("profile editing", () => {
  test.setTimeout(60_000)

  // Safety net — if a test fails midway, revert the bio
  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      await sql`
        UPDATE users SET bio = NULL
        WHERE email = 'colby@jrnxf.co' AND bio = ${TEST_BIO}
      `
    } finally {
      await sql.end()
    }
  })

  test("can edit profile bio and save", async ({ page }) => {
    await page.goto("/auth/me/edit")
    await page.waitForLoadState("networkidle")

    // Verify form loaded with fields
    await expect(page.getByLabel("Name")).toBeVisible()
    await expect(page.getByLabel("Bio")).toBeVisible()

    // Update bio
    const bioField = page.getByLabel("Bio")
    await bioField.clear()
    await bioField.fill(TEST_BIO)

    // Submit
    await page.getByRole("button", { name: "submit", exact: true }).click()

    // Should redirect to profile page
    await expect(page).toHaveURL(/\/auth\/me$/, { timeout: 15_000 })
    await page.waitForLoadState("networkidle")

    // Verify the bio is visible on the profile page (scoped to avoid edit form textarea during transition)
    await expect(page.locator("main span", { hasText: TEST_BIO })).toBeVisible({
      timeout: 10_000,
    })

    // Clean up: clear the bio via the edit form
    await page.goto("/auth/me/edit")
    await page.waitForLoadState("networkidle")
    const bioFieldAgain = page.getByLabel("Bio")
    await bioFieldAgain.clear()
    await page.getByRole("button", { name: "submit", exact: true }).click()
    await expect(page).toHaveURL(/\/auth\/me$/, { timeout: 15_000 })
    await expect(page.getByText("Profile updated")).toBeVisible()
  })

  test("cancel returns to profile without saving", async ({ page }) => {
    await page.goto("/auth/me/edit")
    await page.waitForLoadState("networkidle")

    // Click cancel
    await page.getByRole("button", { name: "cancel" }).click()

    await expect(page).toHaveURL("/auth/me", { timeout: 10_000 })
  })
})
