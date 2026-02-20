import postgres from "postgres";

import { expect, test } from "../fixtures";

test.describe("follow / unfollow", () => {
  test.setTimeout(60_000);

  test.afterAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      // The test is idempotent (unfollows at end), but clean up just in case
    } finally {
      await sql.end();
    }
  });

  test("can follow and unfollow a user", async ({ page }) => {
    // Navigate to users list
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    // Collect all user profile hrefs while still on the /users page
    const userLinks = page.getByRole("main").locator('a[href^="/users/"]');
    const count = await userLinks.count();
    test.skip(count < 2, "Not enough users to find a non-self profile");

    const hrefs: string[] = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await userLinks.nth(i).getAttribute("href");
      if (href) hrefs.push(href);
    }

    // Try each user until we find one with a Follow/Unfollow button (not our own)
    let foundProfile = false;
    for (const href of hrefs) {
      await page.goto(href);
      await page.waitForLoadState("networkidle");

      const followBtn = page.getByRole("button", {
        name: "Follow",
        exact: true,
      });
      const unfollowBtn = page.getByRole("button", { name: "Unfollow" });

      const hasFollow = await followBtn.isVisible().catch(() => false);
      const hasUnfollow = await unfollowBtn.isVisible().catch(() => false);

      if (!hasFollow && !hasUnfollow) continue;

      foundProfile = true;

      // If already following, unfollow first to reset state
      if (hasUnfollow) {
        await unfollowBtn.click();
        await expect(followBtn).toBeVisible({ timeout: 5000 });
      }

      // Follow
      await followBtn.click();
      await expect(unfollowBtn).toBeVisible({ timeout: 5000 });

      // Unfollow to keep test idempotent
      await unfollowBtn.click();
      await expect(followBtn).toBeVisible({ timeout: 5000 });
      break;
    }

    test.skip(!foundProfile, "No non-self user profile found");
  });
});
