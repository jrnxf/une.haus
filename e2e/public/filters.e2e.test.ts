import { type Locator, type Page } from "@playwright/test";

import { expect, test } from "../fixtures";

// Base UI Menu requires native click — Playwright's .click() doesn't fire
// the pointer events Base UI expects in headless Chromium
async function nativeClick(locator: Locator) {
  await locator.waitFor();
  await locator.evaluate((el) => (el as HTMLElement).click());
}

async function addTextFilter(page: Page, filterName: string) {
  const filterButton = page.getByRole("button", { name: /filters/i });
  const menuitem = page.getByRole("menuitem", { name: filterName });

  // Base UI Menu can be flaky in headless Chromium — retry opening if needed
  await expect(async () => {
    await nativeClick(filterButton);
    await menuitem.waitFor({ timeout: 2000 });
  }).toPass({ timeout: 10_000 });

  await nativeClick(menuitem);
  await page.getByPlaceholder("search...").waitFor();
}

test.describe("filtered lists", () => {
  test("tricks search narrows results", async ({ page }) => {
    await page.goto("/tricks");
    await page.getByRole("table").waitFor();

    await addTextFilter(page, "Name");

    await page.getByPlaceholder("search...").fill("unispin");
    await page.getByPlaceholder("search...").press("Enter");

    await expect(
      page.getByText("unispin").first().or(page.getByText("no tricks found")),
    ).toBeVisible();
  });

  test("users search narrows results", async ({ page }) => {
    await page.goto("/users");
    await page.getByTestId("user-card").first().waitFor();

    await addTextFilter(page, "Name");

    await page.getByPlaceholder("search...").fill("zzzznonexistent");
    await page.getByPlaceholder("search...").press("Enter");

    await expect(page.getByText("no users")).toBeVisible();
  });

  test("posts search narrows results", async ({ page }) => {
    await page.goto("/posts");
    await page.getByRole("main").getByRole("link").first().waitFor();

    await addTextFilter(page, "Search");

    await page.getByPlaceholder("search...").fill("zzzznonexistent");
    await page.getByPlaceholder("search...").press("Enter");

    await expect(page.getByText("no posts")).toBeVisible();
  });

  test("vault search narrows results", async ({ page }) => {
    await page.goto("/vault");
    await page.getByRole("main").getByRole("link").first().waitFor();

    await addTextFilter(page, "Search");

    await page.getByPlaceholder("search...").fill("zzzznonexistent");
    await page.getByPlaceholder("search...").press("Enter");

    // Videos are inside img links — with nonsense query, main content should only have header links left
    await expect(page.getByRole("main").getByRole("img")).toHaveCount(0);
  });

  test("clearing a filter restores results", async ({ page }) => {
    await page.goto("/users");
    await page.getByTestId("user-card").first().waitFor();

    await addTextFilter(page, "Name");

    await page.getByPlaceholder("search...").fill("zzzznonexistent");
    await page.getByPlaceholder("search...").press("Enter");
    await expect(page.getByText("no users")).toBeVisible();

    // Remove the filter
    await page.getByRole("button", { name: "Remove filter" }).click();

    // Results should be restored
    await expect(page.getByTestId("user-card").first()).toBeVisible();
  });
});
