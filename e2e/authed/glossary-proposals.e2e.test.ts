import postgres from "postgres"

import { expect, test } from "../fixtures"
import { dismissOverlay } from "../helpers"

test.describe.serial("glossary proposals", () => {
  test.setTimeout(90_000)

  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      await sql`DELETE FROM glossary_proposals WHERE reason LIKE 'e2e-%'`
      await sql`DELETE FROM trick_elements WHERE name LIKE 'e2e-%'`
      await sql`DELETE FROM notifications WHERE entity_type = 'glossaryProposal' AND data::text LIKE '%e2e-%'`
    } finally {
      await sql.end()
    }
  })

  test("user submits element proposal, admin approves, user gets notification", async ({
    page,
    userPage,
  }) => {
    // --- Phase 1: Beau submits a new element proposal ---
    await userPage.goto("/tricks/glossary/elements/create")
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    await userPage.getByLabel("name").fill("e2e-test-element")
    await userPage.getByLabel("reason").fill("e2e-glossary-approve-test")

    await userPage.getByRole("button", { name: "submit", exact: true }).click()

    await expect(
      userPage.getByText("proposal submitted for review"),
    ).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 2: Colby (admin) approves ---
    await page.goto("/admin/review?outer=tricks&inner=glossary")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await page.getByRole("tab", { name: /glossary/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const reasonText = page.getByText('"e2e-glossary-approve-test"')
    await expect(reasonText).toBeVisible({ timeout: 10_000 })

    const card = reasonText.locator("..").locator("..")
    await card.getByPlaceholder("review notes...").fill("e2e-review-approved")
    await card.getByRole("button", { name: "approve" }).click()

    await expect(page.getByText("proposal approved")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 3: Verify beau received a notification ---
    await userPage.goto("/notifications")
    await userPage.waitForLoadState("networkidle")

    await expect(
      userPage.getByText("approved your glossary proposal"),
    ).toBeVisible({
      timeout: 10_000,
    })
  })

  test("user submits element proposal, admin rejects, user gets notification", async ({
    page,
    userPage,
  }) => {
    // --- Phase 1: Beau submits a new element proposal ---
    await userPage.goto("/tricks/glossary/elements/create")
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    await userPage.getByLabel("name").fill("e2e-test-element-reject")
    await userPage.getByLabel("reason").fill("e2e-glossary-reject-test")

    await userPage.getByRole("button", { name: "submit", exact: true }).click()

    await expect(
      userPage.getByText("proposal submitted for review"),
    ).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 2: Colby (admin) rejects ---
    await page.goto("/admin/review?outer=tricks&inner=glossary")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await page.getByRole("tab", { name: /glossary/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const reasonText = page.getByText('"e2e-glossary-reject-test"')
    await expect(reasonText).toBeVisible({ timeout: 10_000 })

    const card = reasonText.locator("..").locator("..")
    await card.getByPlaceholder("review notes...").fill("e2e-review-rejected")
    await card.getByRole("button", { name: "reject" }).click()

    await expect(page.getByText("proposal rejected")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 3: Verify beau received a rejection notification ---
    // The notification is created asynchronously after the admin action,
    // so retry navigation until it appears.
    await expect(async () => {
      await userPage.goto("/notifications")
      await userPage.waitForLoadState("networkidle")

      await userPage.getByRole("tab", { name: /all/i }).click()
      await userPage.waitForLoadState("networkidle")

      await expect(
        userPage.getByText("rejected your glossary proposal").first(),
      ).toBeVisible({ timeout: 5000 })
    }).toPass({ timeout: 30_000 })
  })
})
