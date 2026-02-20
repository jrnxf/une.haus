import { type Page } from "@playwright/test";
import postgres from "postgres";

import { expect, test } from "../fixtures";

/** Dismiss Vite error overlay if present (can appear from concurrent server requests in dev) */
async function dismissOverlay(page: Page) {
  if (await page.locator("vite-error-overlay").isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await page
      .locator("vite-error-overlay")
      .waitFor({ state: "hidden", timeout: 1000 })
      .catch(() => {});
  }
}

test.describe("message deletion", () => {
  test.setTimeout(60_000);

  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      await sql`DELETE FROM chat_messages WHERE content LIKE 'e2e-del-%'`;
    } finally {
      await sql.end();
    }
  });

  test("can delete own chat message", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    await dismissOverlay(page);

    // Send a message
    const uniqueText = `e2e-del-${Date.now()}`;
    await page.getByPlaceholder("write a message...").fill(uniqueText);
    await page.getByRole("button", { name: "submit" }).click();
    await expect(page.getByText(uniqueText)).toBeVisible();
    await page.waitForLoadState("networkidle");
    await dismissOverlay(page);

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    });

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
        await page.keyboard.press("Escape");
        await expect(page.getByRole("alertdialog")).not.toBeVisible({
          timeout: 2000,
        });
      }

      await messageBubble.click();
      const deleteItem = page.getByRole("menuitem", { name: "Delete" });
      await expect(deleteItem).toBeVisible({ timeout: 3000 });
      await deleteItem.click({ timeout: 3000 });

      // Wait for confirm dialog to appear
      await expect(page.getByText("Delete message?")).toBeVisible({
        timeout: 3000,
      });

      // Wait for the menu to fully close before clicking the confirm button.
      // The menu backdrop can intercept clicks on the alert dialog.
      await expect(deleteItem).not.toBeVisible({ timeout: 3000 });

      // Click the confirm button
      const dialog = page.getByRole("alertdialog");
      await dialog.getByRole("button", { name: "Delete" }).click({
        timeout: 3000,
      });

      // Verify the deletion mutation actually fired
      await expect(page.getByText("Message deleted")).toBeVisible({
        timeout: 5000,
      });
    }).toPass({ timeout: 30_000 });

    await expect(messageBubble).not.toBeVisible({ timeout: 5000 });
  });

  test("can delete message via edit drawer", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    await dismissOverlay(page);

    // Send a message
    const uniqueText = `e2e-del-edit-${Date.now()}`;
    await page.getByPlaceholder("write a message...").fill(uniqueText);
    await page.getByRole("button", { name: "submit" }).click();
    await expect(page.getByText(uniqueText)).toBeVisible();
    await page.waitForLoadState("networkidle");
    await dismissOverlay(page);

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    });

    // Open menu → Edit → Delete from drawer → confirm → verify toast.
    // Retry the whole flow: a message list refetch can remount the bubble,
    // resetting editDrawerOpen state and closing the edit dialog.
    await expect(async () => {
      // Dismiss any stale dialogs from a previous attempt
      if (
        await page
          .getByRole("alertdialog")
          .isVisible()
          .catch(() => false)
      ) {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("alertdialog")).not.toBeVisible({
          timeout: 2000,
        });
      }

      // Open menu → click Edit
      await messageBubble.click();
      const editItem = page.getByRole("menuitem", { name: "Edit" });
      await expect(editItem).toBeVisible({ timeout: 3000 });
      await editItem.click({ timeout: 3000 });

      // Wait for edit dialog
      const editDialog = page.getByRole("dialog", { name: "Edit message" });
      await expect(editDialog).toBeVisible({ timeout: 3000 });

      // Click delete in the edit drawer
      await editDialog
        .getByRole("button", { name: "Delete" })
        .click({ timeout: 3000 });

      // Wait for confirm dialog
      await expect(page.getByText("Delete message?")).toBeVisible({
        timeout: 3000,
      });

      // Click the confirm button
      const dialog = page.getByRole("alertdialog");
      await dialog
        .getByRole("button", { name: "Delete" })
        .click({ timeout: 3000 });

      // Verify the deletion mutation actually fired
      await expect(page.getByText("Message deleted")).toBeVisible({
        timeout: 5000,
      });
    }).toPass({ timeout: 30_000 });

    // Use messageBubble reference — getByText would match the edit drawer textarea too
    await expect(messageBubble).not.toBeVisible({ timeout: 5000 });
  });
});
