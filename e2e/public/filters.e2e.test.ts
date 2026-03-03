import { type Page } from "@playwright/test"

import { expect, test } from "../fixtures"

async function addTextFilter(page: Page, filterName: string) {
  const filterButton = page.getByRole("button", { name: /filters/i })
  const option = page.getByRole("option", { name: filterName })

  await expect(async () => {
    await filterButton.click()
    await option.waitFor({ timeout: 2000 })
  }).toPass({ timeout: 10_000 })

  await option.click()

  // Close the filter popover so the command input doesn't conflict with the text filter input
  await page.keyboard.press("Escape")
}

function textFilterInput(page: Page) {
  return page.getByRole("textbox", { name: "search..." })
}

test.describe("filtered lists", () => {
  test("tricks search narrows results", async ({ page }) => {
    await page.goto("/tricks")
    await page.getByRole("table").waitFor()

    await addTextFilter(page, "Name")

    await textFilterInput(page).fill("unispin")
    await textFilterInput(page).press("Enter")

    await expect(
      page.getByText("unispin").first().or(page.getByText("no tricks found")),
    ).toBeVisible()
  })

  test("users search narrows results", async ({ page }) => {
    await page.goto("/users")
    await page.getByTestId("user-card").first().waitFor()

    await addTextFilter(page, "Name")

    await textFilterInput(page).fill("zzzznonexistent")
    await textFilterInput(page).press("Enter")

    await expect(page.getByText("no users")).toBeVisible()
  })

  test("posts search narrows results", async ({ page }) => {
    await page.goto("/posts")
    await page.getByRole("main").getByRole("link").first().waitFor()

    await addTextFilter(page, "Search")

    await textFilterInput(page).fill("zzzznonexistent")
    await textFilterInput(page).press("Enter")

    await expect(page.getByText("no posts")).toBeVisible()
  })

  test("vault search narrows results", async ({ page }) => {
    await page.goto("/vault")
    await page.getByRole("main").getByRole("link").first().waitFor()

    await addTextFilter(page, "title")

    await textFilterInput(page).fill("zzzznonexistent")
    await textFilterInput(page).press("Enter")

    // Videos are inside img links — with nonsense query, main content should only have header links left
    await expect(page.getByRole("main").getByRole("img")).toHaveCount(0)
  })

  test("clearing a filter restores results", async ({ page }) => {
    await page.goto("/users")
    await page.getByTestId("user-card").first().waitFor()

    await addTextFilter(page, "Name")

    await textFilterInput(page).fill("zzzznonexistent")
    await textFilterInput(page).press("Enter")
    await expect(page.getByText("no users")).toBeVisible()

    // Remove the filter
    await page.getByRole("button", { name: "Remove filter" }).click()

    // Results should be restored
    await expect(page.getByTestId("user-card").first()).toBeVisible()
  })
})
