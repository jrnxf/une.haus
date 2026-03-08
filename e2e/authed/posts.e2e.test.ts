import { type Page } from "@playwright/test"
import postgres from "postgres"

import { expect, test } from "../fixtures"
import {
  deleteMessageViaUI,
  dismissOverlay,
  unlikeMessageViaUI,
} from "../helpers"

/** Wait for alert dialog, then click the confirm button */
async function confirmAlertDialog(page: Page, buttonName: string) {
  const dialog = page.getByRole("alertdialog")
  await dialog.waitFor({ state: "visible", timeout: 5000 })
  await expect(async () => {
    await dialog.getByRole("button", { name: buttonName }).click({
      timeout: 3000,
    })
  }).toPass({ timeout: 10_000 })
}

/** Navigate to the first post detail page. Skips test if no posts exist. */
async function navigateToFirstPost(page: Page) {
  await page.goto("/posts")
  await page.waitForLoadState("networkidle")

  const postLink = page.getByTestId("post-card").first()
  const isVisible = await postLink.isVisible().catch(() => false)
  test.skip(!isVisible, "No posts available to click")

  // The route loader for /posts/$postId may fail under dev server load and
  // redirect back to /posts. Also, a parallel test may delete the post we
  // picked. On each retry, re-fetch /posts and pick a fresh link.
  await expect(async () => {
    await dismissOverlay(page)
    if (!/\/posts\/\d+$/.test(page.url())) {
      await page.goto("/posts", { waitUntil: "commit" })
      await page.waitForLoadState("networkidle")
      const href = await page
        .getByTestId("post-card")
        .first()
        .locator("a")
        .first()
        .getAttribute("href")
      if (href) {
        await page.goto(href, { waitUntil: "commit" })
      }
    }
    await expect(page).toHaveURL(/\/posts\/\d+/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 5000,
    })
  }).toPass({ timeout: 30_000 })

  await page.waitForLoadState("networkidle")
  await dismissOverlay(page)
}

test.describe("posts flow", () => {
  // Under parallel load the dev server can be slow; give tests extra time
  test.setTimeout(60_000)

  // Safety net — if a test fails midway, clean up leftover data
  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!)
    try {
      await sql`DELETE FROM post_messages WHERE content LIKE 'e2e-%'`
      await sql`DELETE FROM posts WHERE title = 'Playwright Test Post'`
      await sql`DELETE FROM notifications WHERE entity_type = 'post' AND data::text LIKE '%e2e-%'`
    } finally {
      await sql.end()
    }
  })

  test("posts list loads with cards", async ({ page }) => {
    await page.goto("/posts")

    // Should show at least one post card or empty state
    await expect(
      page.getByTestId("post-card").first().or(page.getByText("no posts")),
    ).toBeVisible()
  })

  test("clicking a post card navigates to detail page", async ({ page }) => {
    await page.goto("/posts")
    await page.waitForLoadState("networkidle")

    const firstPost = page.getByTestId("post-card").first()
    const isVisible = await firstPost.isVisible().catch(() => false)
    test.skip(!isVisible, "No posts available to click")

    // The route loader for /posts/$postId may fail under dev server load and
    // redirect back to /posts. Retry the navigation if that happens.
    await expect(async () => {
      await dismissOverlay(page)
      if (!/\/posts\/\d+$/.test(page.url())) {
        await page.goto("/posts", { waitUntil: "commit" })
        await page.waitForLoadState("networkidle")
        const href = await page
          .getByTestId("post-card")
          .first()
          .locator("a")
          .first()
          .getAttribute("href")
        if (href) {
          await page.goto(href, { waitUntil: "commit" })
        }
      }
      await expect(page).toHaveURL(/\/posts\/\d+/)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: 5000,
      })
    }).toPass({ timeout: 30_000 })
  })

  test("can like a post", async ({ page }) => {
    await navigateToFirstPost(page)

    const likesBtn = page
      .getByRole("button", { name: "likes", exact: true })
      .first()
    const likeItem = page.getByRole("menuitem", { name: "like", exact: true })
    const unlikeItem = page.getByRole("menuitem", {
      name: "unlike",
      exact: true,
    })

    // If already liked from a previous run, unlike first
    await likesBtn.click()
    if (await unlikeItem.isVisible().catch(() => false)) {
      await unlikeItem.click()
      await likesBtn.click()
      await expect(likeItem).toBeVisible()
    }

    await likeItem.click()
    await likesBtn.click()
    await expect(unlikeItem).toBeVisible()

    // Clean up: unlike so the test is idempotent
    await unlikeItem.click()
    await likesBtn.click()
    await expect(likeItem).toBeVisible()
  })

  test("can comment on a post", async ({ page }) => {
    await navigateToFirstPost(page)

    const uniqueText = `e2e-post-comment-${Date.now()}`
    await page.getByPlaceholder("write a message...").fill(uniqueText)
    await page.getByRole("button", { name: "submit", exact: true }).click()

    await expect(page.getByText(uniqueText)).toBeVisible()

    // Clean up: delete the comment via UI
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)
    await deleteMessageViaUI(page, uniqueText)
  })

  test("can like a post comment", async ({ page }) => {
    await navigateToFirstPost(page)

    const uniqueText = `e2e-post-clike-${Date.now()}`
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

    // Clean up: unlike then delete the comment via UI
    await unlikeMessageViaUI(page, uniqueText)
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)
    await deleteMessageViaUI(page, uniqueText)
  })

  test("can copy a post comment", async ({ page }) => {
    await navigateToFirstPost(page)

    const uniqueText = `e2e-post-ccopy-${Date.now()}`
    await page.getByPlaceholder("write a message...").fill(uniqueText)
    await page.getByRole("button", { name: "submit", exact: true }).click()
    await expect(page.getByText(uniqueText)).toBeVisible()
    await page.waitForLoadState("networkidle")

    await dismissOverlay(page)

    const messageBubble = page.getByRole("button", {
      name: `Message: ${uniqueText}`,
    })

    // Retry menu interaction — the messages list refetch can detach DOM mid-animation.
    // Using force:true to skip stability check (animation) since toPass retries on failure.
    await expect(async () => {
      await messageBubble.click()
      await page
        .getByRole("dialog", { name: "message details" })
        .getByRole("button", { name: "copy" })
        .click({ force: true, timeout: 3000 })
    }).toPass({ timeout: 15_000 })

    await expect(page.getByText("Message copied")).toBeVisible()

    // Clean up: delete the comment via UI
    await page.waitForLoadState("networkidle")
    await dismissOverlay(page)
    await deleteMessageViaUI(page, uniqueText)
  })

  test("create post flow", async ({ page }) => {
    await page.goto("/posts/create")

    // Wait for hydration — under parallel load, SSR completes but React may
    // not have attached event handlers yet, causing clicks to be swallowed.
    await page.waitForLoadState("networkidle")

    // Fill in the form
    await page.getByLabel("Title").fill("Playwright Test Post")
    await page
      .getByLabel("Content")
      .fill("This is a test post from Playwright e2e tests.")

    // Select at least one tag (required) - click first badge in the Tags section
    // The BadgeInput renders buttons with aria-label like "Select tag_name"
    // Must verify the click registered — under parallel load, the page may not
    // have hydrated yet when Playwright clicks, silently swallowing the event.
    await page.getByLabel("Select flatland").click()
    await expect(page.getByLabel("Remove flatland")).toBeVisible()

    // Submit the form — capture the detail URL before any redirect
    let postDetailUrl = ""
    const onNav = (frame: { url: () => string }) => {
      const url = frame.url()
      if (/\/posts\/\d+$/.test(url)) postDetailUrl = url
    }
    page.on("framenavigated", onNav)

    await page.getByRole("button", { name: "submit", exact: true }).click()
    await expect(page).toHaveURL(/\/posts\/\d+/, { timeout: 15_000 })
    if (!postDetailUrl) postDetailUrl = page.url()
    page.off("framenavigated", onNav)

    // The route loader may fail under dev load and redirect to /posts.
    // If that happens, navigate directly to the captured detail URL.
    await expect(async () => {
      if (!/\/posts\/\d+$/.test(page.url())) {
        await page.goto(postDetailUrl)
      }
      await expect(
        page.getByRole("heading", { name: "Playwright Test Post" }),
      ).toBeVisible({
        timeout: 3000,
      })
    }).toPass({ timeout: 30_000 })

    // Clean up: delete the post via UI
    await dismissOverlay(page)
    await page.getByLabel("Delete").click()
    await expect(page.getByText("Delete Post")).toBeVisible()
    await confirmAlertDialog(page, "Delete")
    await expect(page).toHaveURL("/posts", { timeout: 15_000 })
    await expect(page.getByText("Post deleted")).toBeVisible({
      timeout: 10_000,
    })
  })
})
