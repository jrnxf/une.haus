import "dotenv/config"
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list", { printSteps: true }], ["html"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    ...(process.env.SLOW_MO && { launchOptions: { slowMo: 1000 } }),
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "public",
      testMatch: /public\/.*/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authed",
      testMatch: /authed\/.*/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "node_modules/.bin/vite dev --host",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    stdout: "pipe",
    timeout: 120_000,
  },
})
