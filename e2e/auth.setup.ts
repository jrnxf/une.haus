import { test as setup } from "@playwright/test"
import postgres from "postgres"

import type { Page } from "@playwright/test"

async function waitForVerifyForm(page: Page) {
  await page.getByRole("textbox").waitFor({ timeout: 5000 })
}

async function authenticate(
  page: Page,
  sql: ReturnType<typeof postgres>,
  email: string,
  code: string,
  storageStatePath: string,
) {
  // Clean up any existing codes and insert a fresh one
  await sql`DELETE FROM auth_codes WHERE code = ${code}`
  await sql`
    INSERT INTO auth_codes (id, email, code, expires_at)
    VALUES (
      gen_random_uuid()::text,
      ${email},
      ${code},
      now() + interval '5 minutes'
    )
  `

  // Navigate to the verify page and wait for the app to hydrate.
  // `networkidle` is brittle here because the dev app now keeps background
  // requests alive, which makes Playwright wait forever before any tests run.
  await page.goto("/auth/verify")
  await waitForVerifyForm(page)

  // Handle transient Nitro SSR errors — if the form doesn't load, reload
  const otpInput = page.getByRole("textbox")
  try {
    await otpInput.waitFor({ timeout: 5000 })
  } catch {
    await page.reload({ waitUntil: "domcontentloaded" })
    await waitForVerifyForm(page)
  }

  // Fill the OTP code and submit
  await otpInput.pressSequentially(code)
  await page.getByRole("button", { name: "Verify" }).click()

  // Wait for redirect after successful verification
  await page.waitForURL("**/auth/me", { timeout: 15_000 })

  // Save the authenticated state
  await page.context().storageState({ path: storageStatePath })
}

setup("authenticate admin", async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL!)
  try {
    await authenticate(
      page,
      sql,
      "colby@jrnxf.co",
      "9999",
      "e2e/.auth/admin.json",
    )
  } finally {
    await sql.end()
  }
})

setup("authenticate user", async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL!)
  try {
    await authenticate(
      page,
      sql,
      "beau@jrnxf.co",
      "8888",
      "e2e/.auth/user.json",
    )
  } finally {
    await sql.end()
  }
})
