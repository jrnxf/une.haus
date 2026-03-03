import postgres from "postgres"

import { expect, test } from "../fixtures"
import { dismissOverlay } from "../helpers"

const E2E_SUFFIX = " e2e"

test.describe.serial("trick suggestions", () => {
  test.setTimeout(90_000)

  // Safety net — if a test fails midway, revert trick and clean up suggestions
  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      await sql`
        UPDATE tricks
        SET description = REPLACE(description, ${E2E_SUFFIX}, '')
        WHERE description LIKE ${`%${E2E_SUFFIX}`}
      `
      await sql`DELETE FROM trick_suggestions WHERE reason LIKE 'e2e-%'`
      await sql`DELETE FROM notifications WHERE data::text LIKE '%e2e-%'`
    } finally {
      await sql.end()
    }
  })

  test("user submits suggestion, admin approves, user gets notification", async ({
    page,
    userPage,
  }) => {
    // --- Phase 1: Beau submits a suggestion ---

    // Navigate to a trick via the tricks list to get a valid trick URL
    await userPage.goto("/tricks")
    await userPage.waitForLoadState("networkidle")

    // Click the first trick link in the table
    const trickLink = userPage.getByRole("table").getByRole("link").first()
    await expect(trickLink).toBeVisible()
    const _trickName = await trickLink.textContent()
    await trickLink.click()
    await expect(userPage).toHaveURL(/\/tricks\//, { timeout: 10_000 })
    await userPage.waitForLoadState("networkidle")

    // Capture the trick detail URL for later navigation
    const trickDetailUrl = userPage.url()

    // Click the Edit button to navigate to the suggest form
    await userPage.getByRole("button", { name: "Edit" }).click()
    await expect(userPage).toHaveURL(/\/suggest/, { timeout: 10_000 })
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    // Read the current description so we can modify and later revert it
    const descriptionField = userPage.getByLabel("description")
    await expect(descriptionField).toBeVisible({ timeout: 10_000 })
    const originalDescription = await descriptionField.inputValue()

    // Append e2e suffix to the description
    await descriptionField.fill(originalDescription + E2E_SUFFIX)

    // Fill reason so we can identify this suggestion in admin review
    await userPage
      .getByPlaceholder("Explain why these changes should be made...")
      .fill("e2e-suggestion-approve-test")

    await userPage.locator("button[type='submit']").getByText("submit").click()

    // Verify success
    await expect(
      userPage.getByText("suggestion submitted for review"),
    ).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 2: Colby (admin) approves ---
    await page.goto("/admin/review?outer=tricks&inner=suggestions")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    // Click the suggestions inner tab to make sure we're on the right panel
    await page.getByRole("tab", { name: /suggestions/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    // Find the suggestion by its reason text
    const reasonText = page.getByText('"e2e-suggestion-approve-test"')
    await expect(reasonText).toBeVisible({ timeout: 10_000 })

    // The review notes and buttons are siblings within the same card.
    // Navigate up to the card container, then find the controls.
    const card = reasonText.locator("..").locator("..")
    await card.getByPlaceholder("review notes...").fill("e2e-review-approved")
    await card.getByRole("button", { name: "approve" }).click()

    // Verify success toast
    await expect(page.getByText("suggestion approved")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 3: Verify trick was updated ---
    await expect(async () => {
      await userPage.goto(trickDetailUrl)
      await userPage.waitForLoadState("networkidle")
      // The description should now contain the e2e suffix
      await expect(
        userPage.getByText(originalDescription + E2E_SUFFIX),
      ).toBeVisible({ timeout: 5000 })
    }).toPass({ timeout: 15_000 })

    // --- Phase 4: Verify beau received a notification ---
    await expect(async () => {
      await userPage.goto("/notifications")
      await userPage.waitForLoadState("networkidle")
      await expect(
        userPage.getByText("approved your trick suggestion").first(),
      ).toBeVisible()
    }).toPass({ timeout: 30_000 })

    // --- Phase 5: Revert the trick via a second suggestion + approval ---
    await userPage.goto(trickDetailUrl)
    await userPage.waitForLoadState("networkidle")
    await userPage.getByRole("button", { name: "Edit" }).click()
    await expect(userPage).toHaveURL(/\/suggest/, { timeout: 10_000 })
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    const descriptionFieldAgain = userPage.getByLabel("description")
    await descriptionFieldAgain.clear()
    await descriptionFieldAgain.fill(originalDescription)

    await userPage
      .getByPlaceholder("Explain why these changes should be made...")
      .fill("e2e-suggestion-revert")

    await userPage.locator("button[type='submit']").getByText("submit").click()

    await expect(
      userPage.getByText("suggestion submitted for review"),
    ).toBeVisible({
      timeout: 15_000,
    })

    // Admin approves the revert
    await page.goto("/admin/review?outer=tricks&inner=suggestions")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await page.getByRole("tab", { name: /suggestions/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const revertReason = page.getByText('"e2e-suggestion-revert"')
    await expect(revertReason).toBeVisible({ timeout: 10_000 })

    const revertCard = revertReason.locator("..").locator("..")
    await revertCard
      .getByPlaceholder("review notes...")
      .fill("e2e-review-revert")
    await revertCard.getByRole("button", { name: "approve" }).click()

    await expect(page.getByText("suggestion approved")).toBeVisible({
      timeout: 15_000,
    })

    // Verify trick is back to original
    await userPage.goto(trickDetailUrl)
    await userPage.waitForLoadState("networkidle")

    await expect(userPage.getByText(originalDescription)).toBeVisible({
      timeout: 10_000,
    })
  })

  test("user submits suggestion, admin rejects, trick unchanged", async ({
    page,
    userPage,
  }) => {
    // --- Phase 1: Beau submits a suggestion ---
    await userPage.goto("/tricks")
    await userPage.waitForLoadState("networkidle")

    const trickLink = userPage.getByRole("table").getByRole("link").first()
    await expect(trickLink).toBeVisible()
    await trickLink.click()
    await expect(userPage).toHaveURL(/\/tricks\//, { timeout: 10_000 })
    await userPage.waitForLoadState("networkidle")

    const trickDetailUrl = userPage.url()

    await userPage.getByRole("button", { name: "Edit" }).click()
    await expect(userPage).toHaveURL(/\/suggest/, { timeout: 10_000 })
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    const descriptionField = userPage.getByLabel("description")
    await expect(descriptionField).toBeVisible({ timeout: 10_000 })
    const originalDescription = await descriptionField.inputValue()

    // Modify the description
    await descriptionField.fill(originalDescription + E2E_SUFFIX)

    await userPage
      .getByPlaceholder("Explain why these changes should be made...")
      .fill("e2e-suggestion-reject-test")

    await userPage.locator("button[type='submit']").getByText("submit").click()

    await expect(
      userPage.getByText("suggestion submitted for review"),
    ).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 2: Colby (admin) rejects ---
    await page.goto("/admin/review?outer=tricks&inner=suggestions")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await page.getByRole("tab", { name: /suggestions/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const reasonText = page.getByText('"e2e-suggestion-reject-test"')
    await expect(reasonText).toBeVisible({ timeout: 10_000 })

    const card = reasonText.locator("..").locator("..")
    await card.getByPlaceholder("review notes...").fill("e2e-review-rejected")
    await card.getByRole("button", { name: "reject" }).click()

    await expect(page.getByText("suggestion rejected")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 3: Verify trick is unchanged ---
    await userPage.goto(trickDetailUrl)
    await userPage.waitForLoadState("networkidle")

    // Description should NOT contain the e2e suffix
    await expect(
      userPage.getByText(originalDescription + E2E_SUFFIX),
    ).not.toBeVisible({
      timeout: 5000,
    })

    // Original description should still be there
    await expect(userPage.getByText(originalDescription)).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 4: Verify beau received a rejection notification ---
    await expect(async () => {
      await userPage.goto("/notifications")
      await userPage.waitForLoadState("networkidle")
      await expect(
        userPage.getByText("rejected your trick suggestion").first(),
      ).toBeVisible()
    }).toPass({ timeout: 15_000 })
  })
})
