import postgres from "postgres"

import { expect, test } from "../fixtures"
import {
  deleteMessageViaUI,
  dismissOverlay,
  unlikeMessageViaUI,
} from "../helpers"

test.describe("chat", () => {
  // Under parallel load the dev server can be slow; give tests extra time
  test.setTimeout(60_000)

  // Safety net — if a test fails midway, clean up leftover data
  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      await sql`DELETE FROM chat_messages WHERE content LIKE 'e2e-%'`
      await sql`DELETE FROM notifications WHERE entity_type = 'chat' AND data::text LIKE '%e2e-%'`
    } finally {
      await sql.end()
    }
  })

  test("can send a message", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const uniqueText = `e2e-chat-${Date.now()}`
    await page.getByPlaceholder("write a message...").fill(uniqueText)
    await page.getByRole("button", { name: "submit", exact: true }).click()

    await expect(page.getByText(uniqueText)).toBeVisible()

    // Clean up: delete the message via UI
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)
    await deleteMessageViaUI(page, uniqueText)
  })

  test("can like a message", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const uniqueText = `e2e-chat-like-${Date.now()}`
    await page.getByPlaceholder("write a message...").fill(uniqueText)
    await page.getByRole("button", { name: "submit", exact: true }).click()
    await expect(page.getByText(uniqueText)).toBeVisible()
    await page.waitForLoadState("networkidle")

    await dismissOverlay(page)

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    })
    const detailsDialog = page.getByRole("dialog", { name: "message details" })

    // Retry the full like flow — assert against the tray state itself rather than the
    // compact like badge, which is now secondary to the tray actions in this POC.
    await expect(async () => {
      if (await detailsDialog.isVisible().catch(() => false)) {
        await page.keyboard.press("Escape")
        await expect(detailsDialog).not.toBeVisible({ timeout: 2000 })
      }

      await messageBubble.click()
      await expect(detailsDialog).toBeVisible({ timeout: 3000 })
      const unlikeButton = detailsDialog.getByRole("button", { name: "unlike" })

      if (!(await unlikeButton.isVisible().catch(() => false))) {
        await detailsDialog
          .getByRole("button", { name: "like" })
          .click({ force: true, timeout: 3000 })
        // Wait for mutation + refetch to settle
        await page.waitForLoadState("networkidle")
        await dismissOverlay(page)
      }

      await expect(unlikeButton).toBeVisible({ timeout: 5000 })
      await expect(
        detailsDialog.getByRole("button", { name: /view 1 like/i }),
      ).toBeVisible({ timeout: 5000 })
    }).toPass({ timeout: 30_000 })

    await page.keyboard.press("Escape")

    // Clean up: unlike then delete the message via UI
    await unlikeMessageViaUI(page, uniqueText)
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)
    await deleteMessageViaUI(page, uniqueText)
  })

  test("can copy a message", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const uniqueText = `e2e-chat-copy-${Date.now()}`
    await page.getByPlaceholder("write a message...").fill(uniqueText)
    await page.getByRole("button", { name: "submit", exact: true }).click()
    await expect(page.getByText(uniqueText)).toBeVisible()
    await page.waitForLoadState("networkidle")

    await dismissOverlay(page)

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    })

    // Retry menu interaction — the messages list refetch can detach DOM mid-animation
    await expect(async () => {
      await messageBubble.click()
      await page
        .getByRole("dialog", { name: "message details" })
        .getByRole("button", { name: "copy" })
        .click({ timeout: 3000 })
    }).toPass({ timeout: 15_000 })

    await expect(page.getByText("Message copied")).toBeVisible()

    // Clean up: delete the message via UI
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)
    await deleteMessageViaUI(page, uniqueText)
  })
})
