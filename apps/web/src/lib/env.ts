import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

const booleanEnvVar = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true")

export const env = createEnv({
  client: {
    VITE_ENVIRONMENT: z
      .enum(["development", "production"])
      .default("development"),
    VITE_SENTRY_DSN: z.string().optional(),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: "VITE_",

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,

  /**
   * What object holds the environment variables at runtime. This is usually
   * `process.env` or `import.meta.env`.
   */
  runtimeEnv: process.env,

  skipValidation: process.env.BUN_ENV === "test",

  server: {
    CLOUDFLARE_IMAGES_EDITOR_API_TOKEN: z.string(),
    CLOUDFLARE_ACCOUNT_ID: z.string(),
    DATABASE_URL: z.string(),
    GOOGLE_API_KEY: z.string(),
    LOG_SQL: booleanEnvVar,
    MUX_TOKEN_ID: z.string(),
    MUX_TOKEN_SECRET: z.string(),
    MUX_WEBHOOK_SECRET: z.string(),
    RESEND_API_KEY: z.string(),
    SESSION_SECRET: z.string(),
    SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
  },
})

export const isProduction = env.VITE_ENVIRONMENT === "production"
