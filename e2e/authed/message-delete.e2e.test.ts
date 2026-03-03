import postgres from "postgres"

import { expect, test } from "../fixtures"
import { dismissOverlay } from "../helpers"

import type { Page } from "@playwright/test"

/** Get the tiptap editor element inside the message form */
function getEditor(page: Page) {
  return page.locator(".tiptap-wrapper [contenteditable]").first()
}

test.describe("message deletion", () => {
  test.setTimeout(60_000)

  // Safety net — if a test fails midway, clean up leftover data
  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      await sql`DELETE FROM chat_messages WHERE content LIKE 'e2e-del-%'`
    } finally {
      await sql.end()
    }
  })

  test("can delete own chat message", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    // Send a message
    const uniqueText = `e2e-del-${Date.now()}`
    const editor = getEditor(page)
    await editor.click()
    await page.keyboard.type(uniqueText)
    await page.getByRole("button", { name: "submit", exact: true }).click()
    await expect(page.getByText(uniqueText)).toBeVisible()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    })

    // Open menu → click Delete → confirm → verify toast.
    // Retry the whole flow: the menu close animation can race with the confirm
    // dialog, causing the onConfirm callback to not fire.
    await expect(async () => {
      // Dismiss any stale dialog left from a previous attempt
      if (
        await page
          .getByRole("alertdialog")
          .isVisible()
          .catch(() => false)
      ) {
        await page.keyboard.press("Escape")
        await expect(page.getByRole("alertdialog")).not.toBeVisible({
          timeout: 2000,
        })
      }

      await messageBubble.click()
      const deleteItem = page.getByRole("menuitem", { name: "Delete" })
      await expect(deleteItem).toBeVisible({ timeout: 3000 })
      await deleteItem.click({ timeout: 3000 })

      // Wait for confirm dialog to appear
      await expect(page.getByText("Delete message?")).toBeVisible({
        timeout: 3000,
      })

      // Wait for the menu to fully close before clicking the confirm button.
      // The menu backdrop can intercept clicks on the alert dialog.
      await expect(deleteItem).not.toBeVisible({ timeout: 3000 })

      // Click the confirm button
      const dialog = page.getByRole("alertdialog")
      await dialog.getByRole("button", { name: "Delete" }).click({
        timeout: 3000,
      })

      // Verify the deletion mutation actually fired
      await expect(page.getByText("Message deleted")).toBeVisible({
        timeout: 5000,
      })
    }).toPass({ timeout: 30_000 })

    await expect(messageBubble).not.toBeVisible({ timeout: 5000 })
  })

  test("can delete message via edit drawer", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    // Send a message
    const uniqueText = `e2e-del-edit-${Date.now()}`
    const editor = getEditor(page)
    await editor.click()
    await page.keyboard.type(uniqueText)
    await page.getByRole("button", { name: "submit", exact: true }).click()
    await expect(page.getByText(uniqueText)).toBeVisible()
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    })

    // Open menu → Edit → Delete from drawer → confirm → verify toast.
    // Retry the whole flow: a message list refetch can remount the bubble,
    // resetting editDrawerOpen state and closing the edit dialog.
    await expect(async () => {
      // Dismiss any stale dialogs from a previous attempt
      for (const role of ["alertdialog", "dialog"] as const) {
        if (
          await page
            .getByRole(role)
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          await page.keyboard.press("Escape")
          await expect(page.getByRole(role).first()).not.toBeVisible({
            timeout: 2000,
          })
        }
      }

      // Open menu → click Edit
      await messageBubble.click()
      const editItem = page.getByRole("menuitem", { name: "Edit" })
      await expect(editItem).toBeVisible({ timeout: 3000 })
      await editItem.click({ timeout: 3000 })

      // Wait for edit dialog and let any pending refetches settle
      const editDialog = page.getByRole("dialog", { name: "edit message" })
      await expect(editDialog).toBeVisible({ timeout: 3000 })
      await page.waitForLoadState("networkidle")

      // tiptap editor in the edit dialog should contain the message text
      const editEditor = editDialog.locator("[contenteditable]").first()
      await expect(editEditor).toHaveText(uniqueText)

      // Click delete in the edit drawer
      await editDialog
        .getByRole("button", { name: "Delete" })
        .click({ timeout: 5000 })

      // Wait for confirm dialog
      await expect(page.getByText("Delete message?")).toBeVisible({
        timeout: 3000,
      })

      // Click the confirm button
      const dialog = page.getByRole("alertdialog")
      await dialog
        .getByRole("button", { name: "Delete" })
        .click({ timeout: 3000 })

      // Verify the deletion mutation actually fired
      await expect(page.getByText("Message deleted")).toBeVisible({
        timeout: 5000,
      })
    }).toPass({ timeout: 30_000 })

    // Use messageBubble reference — getByText would match the edit drawer textarea too
    await expect(messageBubble).not.toBeVisible({ timeout: 5000 })
  })
})
