import { mock } from "bun:test"

// nitro's task runtime (`nitro/task`) statically imports this virtual module
// at module-eval time. nitro only generates it during a real build, so under
// plain `bun test` the import throws "Cannot find module". Stub it so task
// modules (which import `defineTask`) load — `defineTask` is a passthrough and
// needs nothing from this module.
mock.module("#nitro-internal-virtual/tasks", () => ({
  scheduledTasks: [],
  tasks: {},
}))

// Tests never call out to Cloudflare, Mux, Resend or Google, but `src/lib/env.ts`
// validates the required server vars when it loads and some code paths sign
// with SESSION_SECRET. Fill any that are missing with inert placeholders so
// `bun test` passes with an empty environment (a credential-free CI, or
// Cloudflare Workers Builds). Real values, when present, win.
const testEnvDefaults = {
  CLOUDFLARE_ACCOUNT_ID: "test-account-id",
  CLOUDFLARE_IMAGES_EDITOR_API_TOKEN: "test-images-token",
  GOOGLE_API_KEY: "test-google-key",
  MUX_TOKEN_ID: "test-mux-token-id",
  MUX_TOKEN_SECRET: "test-mux-token-secret",
  MUX_WEBHOOK_SECRET: "test-mux-webhook-secret",
  RESEND_API_KEY: "test-resend-key",
  SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
}
for (const [key, value] of Object.entries(testEnvDefaults)) {
  process.env[key] ??= value
}
