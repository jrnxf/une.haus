import { expect, test } from "../fixtures"

test("home page renders", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL("/")
})

test("privacy page renders", async ({ page }) => {
  await page.goto("/privacy")
  await expect(
    page.getByRole("heading", { name: "Privacy Policy" }),
  ).toBeVisible()
})

test("terms page renders", async ({ page }) => {
  await page.goto("/terms")
  await expect(
    page.getByRole("heading", { name: "Terms of Service" }),
  ).toBeVisible()
})

test("metrics page renders", async ({ page }) => {
  await page.goto("/metrics")
  await expect(page).toHaveURL("/metrics")
})

test("shop page renders", async ({ page }) => {
  await page.goto("/shop")
  await expect(page.getByText("coming soon")).toBeVisible()
})

test("not found route shows fallback", async ({ page }) => {
  await page.goto("/this-does-not-exist")
  await expect(page.getByText("not found")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "back to safety" }),
  ).toBeVisible()
})
