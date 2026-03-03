import { expect, test } from "../fixtures"

const protectedRoutes = [
  "/posts/create",
  "/feedback",
  "/notifications",
  "/auth/me",
  "/tourney/create",
]

for (const route of protectedRoutes) {
  test(`unauthenticated visit to ${route} redirects to /auth`, async ({
    page,
  }) => {
    await page.goto(route)
    await expect(page).toHaveURL(`/auth?redirect=${encodeURIComponent(route)}`)
  })
}
