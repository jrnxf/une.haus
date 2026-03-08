import postgres from "postgres"

import { expect, test } from "../fixtures"
import { deleteMessageViaUI, dismissOverlay } from "../helpers"

import type { Page } from "@playwright/test"

/** Wait for the MentionTextarea's user list to be loaded by checking for a data attribute */
async function waitForMentionReady(page: Page) {
  const wrapper = page.locator("[data-mention-ready='true']")
  await expect(wrapper).toBeVisible({ timeout: 10_000 })
}

/** Get the tiptap editor element inside the message form */
function getEditor(page: Page) {
  return page.locator(".tiptap-wrapper [contenteditable]").first()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

test.describe("mentions & rich text", () => {
  test.describe.configure({ mode: "serial" })
  test.setTimeout(90_000)

  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      await sql`DELETE FROM chat_messages WHERE content LIKE 'e2e-%'`
      await sql`DELETE FROM notifications WHERE entity_type = 'chat' AND data::text LIKE '%e2e-%'`
    } finally {
      await sql.end()
    }
  })

  test("mention dropdown appears when typing @", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await waitForMentionReady(page)
    const editor = getEditor(page)
    await editor.click()
    await page.keyboard.type("e2e-dropdown @", { delay: 50 })

    // tiptap renders a listbox with user options
    const listbox = page.getByRole("listbox")
    await expect(listbox).toBeVisible({ timeout: 5000 })

    // Should have at least one user option
    const options = listbox.getByRole("option")
    await expect(options.first()).toBeVisible({ timeout: 3000 })

    // Close without selecting
    await page.keyboard.press("Escape")
    await expect(listbox).not.toBeVisible()
  })

  test("mention dropdown stays open while typing a full name with space", async ({
    page,
  }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await waitForMentionReady(page)
    const editor = getEditor(page)
    await editor.click()
    await page.keyboard.type("e2e-fullname ", { delay: 30 })
    await page.keyboard.press("@")

    const listbox = page.getByRole("listbox")
    await expect(listbox).toBeVisible({ timeout: 5000 })

    const optionNames = (
      await listbox
        .getByRole("option")
        .evaluateAll((els) =>
          els.map((el) => el.getAttribute("aria-label") ?? ""),
        )
    ).filter(Boolean)
    const fullName = optionNames.find((name) => name.includes(" "))
    expect(fullName).toBeTruthy()

    const parts = fullName!.split(/\s+/).filter(Boolean)
    expect(parts.length).toBeGreaterThan(1)
    const query = `${parts[0]} ${parts[1][0]}`
    await page.keyboard.type(query, { delay: 30 })

    // Regression check: typing a space in "@first last" query must not close mentions.
    await expect(listbox).toBeVisible()
    await expect
      .poll(async () => listbox.getByRole("option").count(), {
        timeout: 5000,
      })
      .toBeGreaterThan(0)
  })

  test("accepting a mention with Enter adds trailing space", async ({
    page,
  }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await waitForMentionReady(page)
    const editor = getEditor(page)
    await editor.click()
    await page.keyboard.type("e2e-enter ", { delay: 30 })
    await page.keyboard.press("@")

    const listbox = page.getByRole("listbox")
    await expect(listbox).toBeVisible({ timeout: 5000 })

    const firstOption = listbox.getByRole("option").first()
    const mentionName = await firstOption.getAttribute("aria-label")
    expect(mentionName).toBeTruthy()

    await page.keyboard.press("Enter")

    // Verify trailing-space behavior by typing a follow-up character.
    await page.keyboard.type("x")

    // tiptap contenteditable uses textContent instead of value
    await expect(editor).toHaveText(
      new RegExp(`e2e-enter @${escapeRegExp(mentionName!)} x`),
    )
    await expect(listbox).not.toBeVisible()
  })

  test("already-mentioned user is excluded from later mention dropdowns", async ({
    page,
  }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await waitForMentionReady(page)
    const editor = getEditor(page)
    await editor.click()
    await page.keyboard.type("e2e-nodupe ", { delay: 30 })
    await page.keyboard.press("@")

    const listbox = page.getByRole("listbox")
    await expect(listbox).toBeVisible({ timeout: 5000 })

    const firstOption = listbox.getByRole("option").first()
    const firstMentionName = await firstOption.getAttribute("aria-label")
    expect(firstMentionName).toBeTruthy()
    await firstOption.click()

    await page.keyboard.type("again @", { delay: 20 })
    await expect(listbox).toBeVisible({ timeout: 5000 })
    await expect(
      listbox.getByRole("option", {
        name: new RegExp(`^${escapeRegExp(firstMentionName!)}$`, "i"),
      }),
    ).toHaveCount(0)
  })

  test("submitting a chat message clears the textarea", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const uniqueId = Date.now()
    const rawContent = `e2e-reset-${uniqueId}`
    const editor = getEditor(page)
    await editor.click()
    await page.keyboard.type(rawContent, { delay: 10 })

    // Plain Enter submit should send + clear.
    await page.keyboard.press("Enter")

    await expect(
      page.getByRole("button", {
        name: `Message: ${rawContent}`,
      }),
    ).toBeVisible({ timeout: 10_000 })

    // tiptap contenteditable should be empty after submit
    await expect(editor).toHaveText("")
  })

  test("selecting a mention from dropdown inserts @name", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    await waitForMentionReady(page)
    const editor = getEditor(page)
    await editor.click()
    await page.keyboard.type("e2e-select ", { delay: 30 })
    await page.keyboard.press("@")

    const listbox = page.getByRole("listbox")
    await expect(listbox).toBeVisible({ timeout: 5000 })

    // Click the first user option
    const firstOption = listbox.getByRole("option").first()
    await firstOption.click()

    // The editor should now contain @username
    await expect(editor).toHaveText(/e2e-select @\S+/)

    // The listbox should close after selection
    await expect(listbox).not.toBeVisible()
  })

  test("bold and italic render in chat messages", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const editor = getEditor(page)
    const uniqueId = Date.now()
    const rawContent = `e2e-richtext-${uniqueId} **bold** and *italic*`
    await editor.click()
    await page.keyboard.type(rawContent, { delay: 10 })
    await page.getByRole("button", { name: "submit", exact: true }).click()

    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    // The message bubble's aria-label contains the raw storage text
    const messageBubble = page.getByRole("button", {
      name: `Message: ${rawContent}`,
    })
    await expect(messageBubble).toBeVisible({ timeout: 10_000 })

    // RichText renders bold as <strong> and italic as <em>
    await expect(messageBubble.locator("strong")).toHaveText("bold")
    await expect(messageBubble.locator("em")).toHaveText("italic")

    // Clean up via UI (raw content matches aria-label)
    await deleteMessageViaUI(page, rawContent)
  })

  test("mention becomes clickable in the message tray", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const uniqueId = Date.now()
    await waitForMentionReady(page)
    const editor = getEditor(page)
    await editor.click()
    await page.keyboard.type(`e2e-menu-${uniqueId} `, { delay: 30 })
    await page.keyboard.press("@")

    const listbox = page.getByRole("listbox")
    await expect(listbox).toBeVisible({ timeout: 5000 })

    // Select first user from dropdown
    const firstOption = listbox.getByRole("option").first()
    await firstOption.click()

    await page.getByRole("button", { name: "submit", exact: true }).click()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    // Find the message bubble (aria-label uses storage format @[id])
    const messageBubble = page.getByRole("button", {
      name: new RegExp(`e2e-menu-${uniqueId}`),
    })
    await expect(messageBubble).toBeVisible({ timeout: 10_000 })

    // Mentions should NOT render as links inside the bubble (disableLinks)
    await expect(messageBubble.locator("a")).toHaveCount(0)

    // Open the tray by clicking the bubble
    await messageBubble.click()
    const detailsDialog = page.getByRole("dialog", { name: "message details" })
    await expect(detailsDialog).toBeVisible({ timeout: 3000 })

    // The rendered mention should now be a clickable profile link inside the tray.
    await expect(detailsDialog.locator("a[href^='/users/']")).toHaveCount(1)

    // Cleanup handled by afterAll SQL
    await page.keyboard.press("Escape")
  })

  test("mention notification is created", async ({ page, userPage }) => {
    // beau mentions colby in chat → colby gets a notification
    await userPage.goto("/chat")
    await userPage.waitForLoadState("networkidle")
    await dismissOverlay(userPage)

    const uniqueId = Date.now()
    await waitForMentionReady(userPage)
    const editor = getEditor(userPage)
    await editor.click()
    await userPage.keyboard.type(`e2e-notif-${uniqueId} `, { delay: 30 })
    await userPage.keyboard.press("@")

    const listbox = userPage.getByRole("listbox")
    await expect(listbox).toBeVisible({ timeout: 5000 })

    await userPage.keyboard.type("colby")
    await userPage.waitForTimeout(500)

    // May match multiple users with "colby" — pick the first one (Colby Thomas)
    const colbyOption = listbox.getByRole("option", { name: /colby/i }).first()
    await expect(colbyOption).toBeVisible({ timeout: 5000 })
    await colbyOption.click()

    await userPage.getByRole("button", { name: "submit", exact: true }).click()

    // Verify the message was sent before checking notifications
    await expect(
      userPage.getByText(new RegExp(`e2e-notif-${uniqueId}`)).first(),
    ).toBeVisible({ timeout: 10_000 })

    // Wait for the server mutation to complete and verify stored content
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      // Retry until the message appears in DB (mutation may still be in-flight)
      await expect(async () => {
        const [msg] =
          await sql`SELECT content FROM chat_messages WHERE content LIKE ${`%e2e-notif-${uniqueId}%`}`
        expect(msg).toBeTruthy()
        expect(msg.content).toMatch(/@\[\d+\]/)
      }).toPass({ timeout: 10_000 })

      // Wait for the notification to be created (async server fn)
      await expect(async () => {
        const rows =
          await sql`SELECT id FROM notifications WHERE type = 'mention' AND data::text LIKE ${`%e2e-notif-${uniqueId}%`}`
        expect(rows.length).toBeGreaterThan(0)
      }).toPass({ timeout: 30_000 })
    } finally {
      await sql.end()
    }

    // Now check the UI
    await expect(async () => {
      await page.goto("/notifications")
      await page.waitForLoadState("networkidle")
      await dismissOverlay(page)

      await page.getByRole("tab", { name: "All" }).click()
      await page.waitForLoadState("networkidle")

      // Should see mention notification with preview containing our unique ID
      await expect(
        page.getByText(new RegExp(`e2e-notif-${uniqueId}`)),
      ).toBeVisible({ timeout: 5000 })
    }).toPass({ timeout: 30_000 })

    // Cleanup handled by afterAll SQL
  })
})
