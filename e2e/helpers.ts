import { expect, type Page } from "@playwright/test"

/** Dismiss Vite error overlay if present (can appear from concurrent server requests in dev) */
export async function dismissOverlay(page: Page) {
  if (
    await page
      .locator("vite-error-overlay")
      .isVisible()
      .catch(() => false)
  ) {
    await page.keyboard.press("Escape")
    await page
      .locator("vite-error-overlay")
      .waitFor({ state: "hidden", timeout: 1000 })
      .catch(() => {})
  }
}

/** Dismiss all visible sonner toasts so they don't intercept clicks. */
async function dismissToasts(page: Page) {
  await page
    .evaluate(() => {
      for (const el of document.querySelectorAll<HTMLElement>(
        "section[aria-label='Notifications alt+T']",
      )) {
        el.style.pointerEvents = "none"
      }
    })
    .catch(() => {})
}

/** Delete a message via its tray actions → Delete → confirm dialog. */
export async function deleteMessageViaUI(page: Page, messageText: string) {
  const messageBubble = page.getByRole("button", {
    name: `Message: ${messageText}`,
  })
  const detailsDialog = page.getByRole("dialog", { name: "message details" })

  await expect(async () => {
    await dismissOverlay(page)

    for (const dialog of [
      page.getByRole("alertdialog"),
      detailsDialog,
    ] as const) {
      if (await dialog.isVisible().catch(() => false)) {
        await page.keyboard.press("Escape")
        await expect(dialog).not.toBeVisible({ timeout: 2000 })
      }
    }

    // Dismiss any visible toasts that could intercept clicks
    await dismissToasts(page)

    await messageBubble.click()
    await expect(detailsDialog).toBeVisible({ timeout: 3000 })
    await detailsDialog.getByRole("button", { name: "delete" }).click({
      timeout: 3000,
    })

    await expect(page.getByText("Delete message?")).toBeVisible({
      timeout: 3000,
    })

    // Dismiss toasts again before clicking confirm so they do not intercept input.
    await dismissToasts(page)

    const dialog = page.getByRole("alertdialog")
    await dialog.getByRole("button", { name: "Delete" }).click({
      timeout: 3000,
    })

    await expect(page.getByText("Message deleted")).toBeVisible({
      timeout: 10_000,
    })
  }).toPass({ timeout: 30_000 })

  await expect(messageBubble).not.toBeVisible({ timeout: 5000 })
}

/** Unlike a message via its tray actions (no-op if not liked). */
export async function unlikeMessageViaUI(page: Page, messageText: string) {
  const messageBubble = page.getByRole("button", {
    name: `Message: ${messageText}`,
  })
  const detailsDialog = page.getByRole("dialog", { name: "message details" })

  await dismissOverlay(page)

  await expect(async () => {
    await dismissToasts(page)
    if (await detailsDialog.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape")
      await expect(detailsDialog).not.toBeVisible({ timeout: 2000 })
    }
    await messageBubble.click()
    await expect(detailsDialog).toBeVisible({ timeout: 3000 })
    const unlikeButton = detailsDialog.getByRole("button", { name: "unlike" })
    const isLiked = await unlikeButton.isVisible().catch(() => false)

    if (isLiked) {
      await unlikeButton.click({ timeout: 3000 })
    } else {
      // Not liked — close the tray
      await page.keyboard.press("Escape")
    }
  }).toPass({ timeout: 15_000 })
}
