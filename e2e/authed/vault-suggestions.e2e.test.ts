import postgres from "postgres"

import { expect, test } from "../fixtures"
import { dismissOverlay } from "../helpers"

const E2E_SUFFIX = " e2e"

test.describe.serial("vault suggestions", () => {
  test.setTimeout(90_000)

  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      await sql`DELETE FROM utv_video_suggestions WHERE reason LIKE 'e2e-%'`
      await sql`UPDATE utv_videos SET title = REPLACE(title, ${E2E_SUFFIX}, '') WHERE title LIKE ${`%${E2E_SUFFIX}`}`
      await sql`DELETE FROM notifications WHERE entity_type = 'utvVideoSuggestion' AND data::text LIKE '%e2e-%'`
    } finally {
      await sql.end()
    }
  })

  test("user suggests edit, admin approves, user gets notification", async ({
    page,
    userPage,
  }) => {
    // --- Phase 1: Beau navigates to a vault video and submits a suggestion ---
    await userPage.goto("/vault")
    await userPage.waitForLoadState("networkidle")

    // Click the first video card link (scoped to main to avoid sidebar avatars)
    const videoLink = userPage
      .getByRole("main")
      .getByRole("link")
      .filter({ has: userPage.getByRole("img") })
      .first()
    await expect(videoLink).toBeVisible()
    await videoLink.click()
    await expect(userPage).toHaveURL(/\/vault\/\d+/, { timeout: 10_000 })
    await userPage.waitForLoadState("networkidle")

    // Capture the video detail URL and navigate to the suggest page
    const videoDetailUrl = userPage.url()
    const suggestUrl = `${videoDetailUrl}/suggest`

    await userPage.goto(suggestUrl)
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    // Read the current title
    const titleField = userPage.getByLabel("Title")
    await expect(titleField).toBeVisible({ timeout: 10_000 })
    const originalTitle = await titleField.inputValue()

    // Append e2e suffix to the title
    await titleField.fill(originalTitle + E2E_SUFFIX)

    // Fill reason so we can identify this suggestion in admin review
    await userPage.getByLabel("Reason").fill("e2e-vault-approve-test")

    await userPage.getByRole("button", { name: "submit", exact: true }).click()

    await expect(
      userPage.getByText("suggestion submitted for review"),
    ).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 2: Colby (admin) approves ---
    await page.goto("/admin/review?outer=vault")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await page.getByRole("tab", { name: /vault/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const reasonText = page.getByText('"e2e-vault-approve-test"')
    await expect(reasonText).toBeVisible({ timeout: 10_000 })

    const card = reasonText.locator("..").locator("..")
    await card.getByPlaceholder("review notes...").fill("e2e-review-approved")
    await card.getByRole("button", { name: "approve" }).click()

    await expect(page.getByText("suggestion approved")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 3: Verify the video title was updated ---
    await userPage.goto(videoDetailUrl)
    await userPage.waitForLoadState("networkidle")

    await expect(
      userPage.getByRole("heading", { name: originalTitle + E2E_SUFFIX }),
    ).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 4: Verify beau received a notification ---
    await expect(async () => {
      await userPage.goto("/notifications")
      await userPage.waitForLoadState("networkidle")
      await expect(
        userPage.getByText("approved your video suggestion").first(),
      ).toBeVisible({ timeout: 3000 })
    }).toPass({ timeout: 30_000 })

    // --- Phase 5: Revert the video via a second suggestion + approval ---
    await userPage.goto(suggestUrl)
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    const titleFieldAgain = userPage.getByLabel("Title")
    await titleFieldAgain.clear()
    await titleFieldAgain.fill(originalTitle)

    await userPage.getByLabel("Reason").fill("e2e-vault-revert")

    await userPage.getByRole("button", { name: "submit", exact: true }).click()

    await expect(
      userPage.getByText("suggestion submitted for review"),
    ).toBeVisible({
      timeout: 10_000,
    })

    // Admin approves the revert
    await page.goto("/admin/review?outer=vault")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await page.getByRole("tab", { name: /vault/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const revertReason = page.getByText('"e2e-vault-revert"')
    await expect(revertReason).toBeVisible({ timeout: 10_000 })

    const revertCard = revertReason.locator("..").locator("..")
    await revertCard
      .getByPlaceholder("review notes...")
      .fill("e2e-review-revert")
    await revertCard.getByRole("button", { name: "approve" }).click()

    await expect(page.getByText("suggestion approved")).toBeVisible({
      timeout: 10_000,
    })

    // Verify video is back to original
    await userPage.goto(videoDetailUrl)
    await userPage.waitForLoadState("networkidle")

    await expect(
      userPage.getByRole("heading", { name: originalTitle }),
    ).toBeVisible({
      timeout: 10_000,
    })
  })

  test("user suggests edit, admin rejects, video unchanged", async ({
    page,
    userPage,
  }) => {
    // --- Phase 1: Beau navigates to a vault video and submits a suggestion ---
    await userPage.goto("/vault")
    await userPage.waitForLoadState("networkidle")

    const videoLink = userPage
      .getByRole("main")
      .getByRole("link")
      .filter({ has: userPage.getByRole("img") })
      .first()
    await expect(videoLink).toBeVisible()
    await videoLink.click()
    await expect(userPage).toHaveURL(/\/vault\/\d+/, { timeout: 10_000 })
    await userPage.waitForLoadState("networkidle")

    const videoDetailUrl = userPage.url()
    const suggestUrl = `${videoDetailUrl}/suggest`

    await userPage.goto(suggestUrl)
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    const titleField = userPage.getByLabel("Title")
    await expect(titleField).toBeVisible({ timeout: 10_000 })
    const originalTitle = await titleField.inputValue()

    // Modify the title
    await titleField.fill(originalTitle + E2E_SUFFIX)

    await userPage.getByLabel("Reason").fill("e2e-vault-reject-test")

    await userPage.getByRole("button", { name: "submit", exact: true }).click()

    await expect(
      userPage.getByText("suggestion submitted for review"),
    ).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 2: Colby (admin) rejects ---
    await page.goto("/admin/review?outer=vault")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await page.getByRole("tab", { name: /vault/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const reasonText = page.getByText('"e2e-vault-reject-test"')
    await expect(reasonText).toBeVisible({ timeout: 10_000 })

    const card = reasonText.locator("..").locator("..")
    await card.getByPlaceholder("review notes...").fill("e2e-review-rejected")
    await card.getByRole("button", { name: "reject" }).click()

    await expect(page.getByText("suggestion rejected")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 3: Verify video is unchanged ---
    await userPage.goto(videoDetailUrl)
    await userPage.waitForLoadState("networkidle")

    await expect(
      userPage.getByRole("heading", { name: originalTitle + E2E_SUFFIX }),
    ).not.toBeVisible({ timeout: 5000 })

    await expect(
      userPage.getByRole("heading", { name: originalTitle }),
    ).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 4: Verify beau received a rejection notification ---
    await expect(async () => {
      await userPage.goto("/notifications")
      await userPage.waitForLoadState("networkidle")
      await expect(
        userPage.getByText("rejected your video suggestion").first(),
      ).toBeVisible()
    }).toPass({ timeout: 15_000 })
  })
})
