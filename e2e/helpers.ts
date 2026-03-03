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

/** Delete a message via its context menu → Delete → confirm dialog. */
export async function deleteMessageViaUI(page: Page, messageText: string) {
  const messageBubble = page.getByRole("button", {
    name: `Message: ${messageText}`,
  })

  await expect(async () => {
    await dismissOverlay(page)

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

    // Close any lingering context menu from a previous attempt or the unlike flow
    if (
      await page
        .getByRole("menu")
        .isVisible()
        .catch(() => false)
    ) {
      await page.keyboard.press("Escape")
      await expect(page.getByRole("menu")).not.toBeVisible({
        timeout: 2000,
      })
    }

    // Dismiss any visible toasts that could intercept clicks
    await dismissToasts(page)

    await messageBubble.click()
    const deleteItem = page.getByRole("menuitem", { name: "Delete" })
    await expect(deleteItem).toBeVisible({ timeout: 3000 })
    // Base UI's backdrop intercepts pointer events; dispatchEvent
    // fires the click directly on the element, bypassing hit-testing.
    await deleteItem.dispatchEvent("click")

    await expect(page.getByText("Delete message?")).toBeVisible({
      timeout: 3000,
    })
    await expect(deleteItem).not.toBeVisible({ timeout: 3000 })

    // Dismiss toasts again before clicking confirm — the menu close can race
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

/** Unlike a message via its context menu (no-op if not liked). */
export async function unlikeMessageViaUI(page: Page, messageText: string) {
  const messageBubble = page.getByRole("button", {
    name: `Message: ${messageText}`,
  })

  await dismissOverlay(page)

  await expect(async () => {
    await dismissToasts(page)
    await messageBubble.click()
    const unlikeItem = page.getByRole("menuitem", { name: "Unlike" })
    const isLiked = await unlikeItem.isVisible().catch(() => false)

    if (isLiked) {
      await unlikeItem.click({ timeout: 3000 })
    } else {
      // Not liked — close the menu
      await page.keyboard.press("Escape")
    }
  }).toPass({ timeout: 15_000 })
}
