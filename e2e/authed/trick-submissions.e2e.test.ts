import postgres from "postgres"

import { expect, test } from "../fixtures"
import { dismissOverlay } from "../helpers"

test.describe.serial("trick submissions", () => {
  test.setTimeout(90_000)

  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      await sql`DELETE FROM trick_submissions WHERE name LIKE 'e2e-%'`
      await sql`DELETE FROM tricks WHERE name LIKE 'e2e-%'`
      await sql`DELETE FROM notifications WHERE entity_type = 'trickSubmission' AND data::text LIKE '%e2e-%'`
    } finally {
      await sql.end()
    }
  })

  test("user submits trick, admin approves, user gets notification", async ({
    page,
    userPage,
  }) => {
    // --- Phase 1: Beau submits a new trick ---
    await userPage.goto("/tricks/create")
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    await userPage.getByLabel("name *").fill("e2e-test-trick")

    await userPage.getByRole("button", { name: "submit", exact: true }).click()

    await expect(userPage.getByText("trick submitted for review")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 2: Colby (admin) approves ---
    await page.goto("/admin/review?outer=tricks&inner=submissions")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await page.getByRole("tab", { name: /submissions/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await expect(page.getByText("e2e-test-trick").first()).toBeVisible({
      timeout: 10_000,
    })

    await page
      .getByPlaceholder("review notes...")
      .first()
      .fill("e2e-review-approved")
    await page.getByRole("button", { name: "approve" }).first().click()

    await expect(page.getByText("submission approved")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 3: Verify beau received a notification ---
    await userPage.goto("/notifications")
    await userPage.waitForLoadState("networkidle")

    await expect(
      userPage.getByText("approved your trick submission").first(),
    ).toBeVisible({
      timeout: 10_000,
    })
  })

  test("user submits trick, admin rejects, user gets notification", async ({
    page,
    userPage,
  }) => {
    // --- Phase 1: Beau submits a new trick ---
    await userPage.goto("/tricks/create")
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    await userPage.getByLabel("name *").fill("e2e-test-trick-reject")

    await userPage.getByRole("button", { name: "submit", exact: true }).click()

    await expect(userPage.getByText("trick submitted for review")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 2: Colby (admin) rejects ---
    await page.goto("/admin/review?outer=tricks&inner=submissions")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await page.getByRole("tab", { name: /submissions/ }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await expect(page.getByText("e2e-test-trick-reject").first()).toBeVisible({
      timeout: 10_000,
    })

    await page
      .getByPlaceholder("review notes...")
      .first()
      .fill("e2e-review-rejected")
    await page.getByRole("button", { name: "reject" }).first().click()

    await expect(page.getByText("submission rejected")).toBeVisible({
      timeout: 10_000,
    })

    // --- Phase 3: Verify beau received a rejection notification ---
    await userPage.goto("/notifications")
    await userPage.waitForLoadState("networkidle")

    await expect(
      userPage.getByText("rejected your trick submission").first(),
    ).toBeVisible({
      timeout: 10_000,
    })
  })
})
