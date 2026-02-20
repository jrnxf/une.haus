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

test.describe("chat", () => {
  // Under parallel load the dev server can be slow; give tests extra time
  test.setTimeout(60_000);

  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      // Cascade deletes handle chat_message_likes
      await sql`DELETE FROM chat_messages WHERE content LIKE 'e2e-%'`;
    } finally {
      await sql.end();
    }
  });

  test("can send a message", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    await dismissOverlay(page);

    const uniqueText = `e2e-chat-${Date.now()}`;
    await page.getByPlaceholder("write a message...").fill(uniqueText);
    await page.locator("button[type='submit']").click();

    await expect(page.getByText(uniqueText)).toBeVisible();
  });

  test("can like a message", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    await dismissOverlay(page);

    const uniqueText = `e2e-chat-like-${Date.now()}`;
    await page.getByPlaceholder("write a message...").fill(uniqueText);
    await page.locator("button[type='submit']").click();
    await expect(page.getByText(uniqueText)).toBeVisible();
    await page.waitForLoadState("networkidle");

    await dismissOverlay(page);

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    });

    // Retry the full like flow — the click may not register if DOM detaches mid-animation,
    // and the refetch can temporarily remove the badge. Combining action + verification
    // in one retry block ensures we re-attempt the like if it didn't take effect.
    await expect(async () => {
      const badgeVisible = await messageBubble
        .locator("..")
        .getByRole("button", { name: /likes/ })
        .isVisible()
        .catch(() => false);

      if (!badgeVisible) {
        await messageBubble.click();
        await page
          .getByRole("menuitem", { name: "Like" })
          .click({ force: true, timeout: 3000 });
        // Wait for mutation + refetch to settle
        await page.waitForLoadState("networkidle");
        await dismissOverlay(page);
      }

      await expect(
        messageBubble.locator("..").getByRole("button", { name: /likes/ }),
      ).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 30000 });
  });

  test("can copy a message", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    await dismissOverlay(page);

    const uniqueText = `e2e-chat-copy-${Date.now()}`;
    await page.getByPlaceholder("write a message...").fill(uniqueText);
    await page.locator("button[type='submit']").click();
    await expect(page.getByText(uniqueText)).toBeVisible();
    await page.waitForLoadState("networkidle");

    await dismissOverlay(page);

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    });

    // Retry menu interaction — the messages list refetch can detach DOM mid-animation
    await expect(async () => {
      await messageBubble.click();
      await page
        .getByRole("menuitem", { name: "Copy" })
        .click({ timeout: 3000 });
    }).toPass({ timeout: 15000 });

    await expect(page.getByText("Message copied")).toBeVisible();
  });
});
