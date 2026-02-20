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

/** Navigate to the first post detail page. Skips test if no posts exist. */
async function navigateToFirstPost(page: Page) {
  await page.goto("/posts");
  await page.waitForLoadState("networkidle");

  const postLink = page.getByTestId("post-card").first();
  const isVisible = await postLink.isVisible().catch(() => false);
  test.skip(!isVisible, "No posts available to click");

  // The route loader for /posts/$postId may fail under dev server load and
  // redirect back to /posts. Also, a parallel test may delete the post we
  // picked. On each retry, re-fetch /posts and pick a fresh link.
  await expect(async () => {
    await dismissOverlay(page);
    if (!/\/posts\/\d+$/.test(page.url())) {
      await page.goto("/posts", { waitUntil: "commit" });
      await page.waitForLoadState("networkidle");
      const href = await page
        .getByTestId("post-card")
        .first()
        .getAttribute("href");
      if (href) {
        await page.goto(href, { waitUntil: "commit" });
      }
    }
    await expect(page).toHaveURL(/\/posts\/\d+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 5000,
    });
  }).toPass({ timeout: 30_000 });

  await page.waitForLoadState("networkidle");
  await dismissOverlay(page);
}

test.describe("posts flow", () => {
  // Under parallel load the dev server can be slow; give tests extra time
  test.setTimeout(60_000);
  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      // Cascade deletes handle post_message_likes
      await sql`DELETE FROM post_messages WHERE content LIKE 'e2e-%'`;
      // Delete test posts (cascade deletes handle post_likes, post_messages)
      await sql`DELETE FROM posts WHERE title = 'Playwright Test Post'`;
    } finally {
      await sql.end();
    }
  });

  test("posts list loads with cards", async ({ page }) => {
    await page.goto("/posts");

    // Should show at least one post card or empty state
    await expect(
      page
        .getByTestId("post-card")
        .first()
        .or(page.getByText("no posts")),
    ).toBeVisible();
  });

  test("clicking a post card navigates to detail page", async ({ page }) => {
    await page.goto("/posts");

    const firstPost = page.getByTestId("post-card").first();
    const isVisible = await firstPost.isVisible().catch(() => false);
    test.skip(!isVisible, "No posts available to click");

    await firstPost.click();
    await expect(page).toHaveURL(/\/posts\/\d+/);

    // Detail page should show the post title as h1
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("can like a post", async ({ page }) => {
    await navigateToFirstPost(page);

    const likeBtn = page.getByRole("button", { name: "Like", exact: true });
    const unlikeBtn = page.getByRole("button", { name: "Unlike" });

    // If already liked from a previous run, unlike first
    if (await unlikeBtn.isVisible().catch(() => false)) {
      await unlikeBtn.click();
      await expect(likeBtn).toBeVisible();
    }

    await likeBtn.click();
    await expect(unlikeBtn).toBeVisible();

    // Clean up: unlike so the test is idempotent
    await unlikeBtn.click();
    await expect(likeBtn).toBeVisible();
  });

  test("can comment on a post", async ({ page }) => {
    await navigateToFirstPost(page);

    const uniqueText = `e2e-post-comment-${Date.now()}`;
    await page.getByPlaceholder("write a message...").fill(uniqueText);
    await page.getByRole("button", { name: "submit", exact: true }).click();

    await expect(page.getByText(uniqueText)).toBeVisible();
  });

  test("can like a post comment", async ({ page }) => {
    await navigateToFirstPost(page);

    const uniqueText = `e2e-post-clike-${Date.now()}`;
    await page.getByPlaceholder("write a message...").fill(uniqueText);
    await page.getByRole("button", { name: "submit", exact: true }).click();
    await expect(page.getByText(uniqueText)).toBeVisible();
    await page.waitForLoadState("networkidle");

    await dismissOverlay(page);

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    });

    const messageContainer = page
      .getByTestId("message-container")
      .filter({ has: messageBubble });

    // Retry the full like flow — the click may not register if DOM detaches mid-animation,
    // and the refetch can temporarily remove the badge. Combining action + verification
    // in one retry block ensures we re-attempt the like if it didn't take effect.
    await expect(async () => {
      const badgeVisible = await messageContainer
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
        messageContainer.getByRole("button", { name: /likes/ }),
      ).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 30_000 });
  });

  test("can copy a post comment", async ({ page }) => {
    await navigateToFirstPost(page);

    const uniqueText = `e2e-post-ccopy-${Date.now()}`;
    await page.getByPlaceholder("write a message...").fill(uniqueText);
    await page.getByRole("button", { name: "submit", exact: true }).click();
    await expect(page.getByText(uniqueText)).toBeVisible();
    await page.waitForLoadState("networkidle");

    await dismissOverlay(page);

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    });

    // Retry menu interaction — the messages list refetch can detach DOM mid-animation.
    // Using force:true to skip stability check (animation) since toPass retries on failure.
    await expect(async () => {
      await messageBubble.click();
      await page
        .getByRole("menuitem", { name: "Copy" })
        .click({ force: true, timeout: 3000 });
    }).toPass({ timeout: 15_000 });

    await expect(page.getByText("Message copied")).toBeVisible();
  });

  test("create post flow", async ({ page }) => {
    await page.goto("/posts/create");

    // Wait for hydration — under parallel load, SSR completes but React may
    // not have attached event handlers yet, causing clicks to be swallowed.
    await page.waitForLoadState("networkidle");

    // Fill in the form
    await page.getByLabel("Title").fill("Playwright Test Post");
    await page
      .getByLabel("Content")
      .fill("This is a test post from Playwright e2e tests.");

    // Select at least one tag (required) - click first badge in the Tags section
    // The BadgeInput renders buttons with aria-label like "Select tag_name"
    // Must verify the click registered — under parallel load, the page may not
    // have hydrated yet when Playwright clicks, silently swallowing the event.
    await page.getByLabel("Select flatland").click();
    await expect(page.getByLabel("Remove flatland")).toBeVisible();

    // Submit the form — capture the detail URL before any redirect
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

    // The route loader may fail under dev load and redirect to /posts.
    // If that happens, navigate directly to the captured detail URL.
    await expect(async () => {
      if (!/\/posts\/\d+$/.test(page.url())) {
        await page.goto(postDetailUrl);
      }
      await expect(
        page.getByRole("heading", { name: "Playwright Test Post" }),
      ).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30_000 });
  });
});
