import { expect, test } from "../fixtures"

test.describe("vault", () => {
  test("grid loads with video thumbnails", async ({ page }) => {
    await page.goto("/vault")

    // Video cards contain thumbnail images
    await expect(
      page
        .getByRole("main")
        .getByRole("img")
        .first()
        .or(page.getByText("no videos")),
    ).toBeVisible()
  })

  test("History page renders from vault link", async ({ page }) => {
    await page.goto("/vault")

    // Click the history link in the header
    await page.getByRole("button", { name: "history" }).click()
    await expect(page).toHaveURL("/vault/history")

    // History content should be visible
    await expect(
      page.getByText("unicycle.tv", { exact: true }).first(),
    ).toBeVisible()
  })

  test("Clap for Olaf increments count", async ({ page }) => {
    await page.goto("/vault/history")

    const clapButton = page.getByRole("button", { name: /clap for olaf/i })
    await expect(clapButton).toBeVisible()

    // Get initial count
    const countText = page.getByText(/\d+ claps?/)
    const initialText = await countText.textContent()
    const initialCount = Number.parseInt(
      initialText?.replace(/,/g, "").match(/\d+/)?.[0] ?? "0",
      10,
    )

    // Click — button is naturally at ~y:380, well below the sticky header
    await clapButton.click()

    // Wait for count to increment (optimistic update should be immediate)
    await expect(countText).toHaveText(
      new RegExp(`${(initialCount + 1).toLocaleString()} claps?`),
    )
  })

  test("video detail page renders", async ({ page }) => {
    await page.goto("/vault")

    // Target video card links (they contain images), not header action links
    const videoCard = page
      .getByRole("main")
      .getByRole("link")
      .filter({ has: page.getByRole("img") })
      .first()
    const isVisible = await videoCard.isVisible().catch(() => false)
    test.skip(!isVisible, "No videos available")

    await videoCard.click()
    await expect(page).toHaveURL(/\/vault\/\d+/)
  })
})
