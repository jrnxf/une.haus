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

/** Wait for alert dialog, then click the confirm button */
async function confirmAlertDialog(page: Page, buttonName: string) {
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await expect(async () => {
    await dialog.getByRole("button", { name: buttonName }).click({
      timeout: 3000,
    });
  }).toPass({ timeout: 10_000 });
}

const POST_TITLE = "e2e-crud-post";
const POST_TITLE_EDITED = "e2e-crud-post-edited";
const POST_CONTENT = "e2e test content for post CRUD lifecycle.";

test.describe("post edit + delete", () => {
  test.setTimeout(90_000);

  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      await sql`DELETE FROM posts WHERE title LIKE 'e2e-crud-post%'`;
    } finally {
      await sql.end();
    }
  });

  test("create, edit, then delete a post", async ({ page }) => {
    // --- CREATE ---
    await page.goto("/posts/create");
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Title").fill(POST_TITLE);
    await page.getByLabel("Content").fill(POST_CONTENT);
    await page.getByLabel("Select flatland").click();
    await expect(page.getByLabel("Remove flatland")).toBeVisible();

    let postDetailUrl = "";
    const onNav = (frame: { url: () => string }) => {
      const url = frame.url();
      if (/\/posts\/\d+$/.test(url)) postDetailUrl = url;
    };
    page.on("framenavigated", onNav);

    await page.getByRole("button", { name: "submit", exact: true }).click();
    await expect(page).toHaveURL(/\/posts\/\d+/, { timeout: 15_000 });
    if (!postDetailUrl) postDetailUrl = page.url();
    page.off("framenavigated", onNav);

    // Ensure detail page loaded
    await expect(async () => {
      if (!/\/posts\/\d+$/.test(page.url())) {
        await page.goto(postDetailUrl);
      }
      await expect(
        page.getByRole("heading", { name: POST_TITLE }),
      ).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30_000 });

    // --- EDIT ---
    // Edit uses asChild + Link, rendered as <a> not <button>
    await page.getByLabel("Edit").click();
    await expect(page).toHaveURL(/\/posts\/\d+\/edit/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");
    await dismissOverlay(page);

    // Change title
    const titleInput = page.getByLabel("Title");
    await titleInput.clear();
    await titleInput.fill(POST_TITLE_EDITED);

    await page.getByRole("button", { name: "submit", exact: true }).click();

    // Should navigate back to detail page with updated title
    await expect(page).toHaveURL(/\/posts\/\d+$/, { timeout: 15_000 });

    await expect(async () => {
      if (!/\/posts\/\d+$/.test(page.url())) {
        await page.goto(postDetailUrl);
      }
      await expect(
        page.getByRole("heading", { name: POST_TITLE_EDITED }),
      ).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30_000 });

    // --- DELETE ---
    await dismissOverlay(page);
    await page.getByLabel("Delete").click();

    // Confirm dialog
    await expect(page.getByText("Delete Post")).toBeVisible();
    await confirmAlertDialog(page, "Delete");

    // Should redirect to /posts after deletion
    await expect(page).toHaveURL("/posts", { timeout: 15_000 });
    await expect(page.getByText("Post deleted")).toBeVisible({
      timeout: 10_000,
    });
  });
});
