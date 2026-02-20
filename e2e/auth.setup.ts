import { test as setup } from "@playwright/test";
import postgres from "postgres";

setup("authenticate", async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL!);

  try {
    // Clean up any existing codes and insert a fresh one
    await sql`DELETE FROM auth_codes WHERE code = '9999'`;
    await sql`
      INSERT INTO auth_codes (id, email, code, expires_at)
      VALUES (
        gen_random_uuid()::text,
        'colby@jrnxf.co',
        '9999',
        now() + interval '5 minutes'
      )
    `;

    // Navigate to the verify page and wait for full hydration
    await page.goto("/auth/verify");
    await page.waitForLoadState("networkidle");

    // Handle transient Nitro SSR errors — if the form doesn't load, reload
    const otpInput = page.getByRole("textbox");
    try {
      await otpInput.waitFor({ timeout: 5000 });
    } catch {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await otpInput.waitFor();
    }

    // Fill the 4-digit OTP code and submit
    await otpInput.pressSequentially("9999");
    await page.getByRole("button", { name: "Verify" }).click();

    // Wait for redirect after successful verification
    await page.waitForURL("**/auth/me", { timeout: 15000 });

    // Save the authenticated state
    await page.context().storageState({ path: "e2e/.auth/user.json" });
  } finally {
    await sql.end();
  }
});
