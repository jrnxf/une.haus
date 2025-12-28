import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const booleanEnvVar = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .default("false");

export const env = createEnv({
  client: {
    VITE_APP_URL: z.string().optional().default("http://localhost:3000"),
    VITE_ENVIRONMENT: z
      .enum(["development", "production"])
      .default("development"),
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

  server: {
    CLOUDFLARE_IMAGES_EDITOR_API_TOKEN: z.string(),
    CLOUDFLARE_ACCOUNT_ID: z.string(),
    HAUS_AWS_ACCESS_KEY_ID: z.string(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    HAUS_AWS_BUCKET_NAME: z.string(),
    HAUS_AWS_REGION: z.string(),
    HAUS_AWS_SECRET_ACCESS_KEY: z.string(),
    DATABASE_HOST: z.string(),
    DATABASE_NAME: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_URL: z.string(),
    DATABASE_USER: z.string(),
    GOOGLE_API_KEY: z.string(),
    LOG_SQL: booleanEnvVar,
    MUX_TOKEN_ID: z.string(),
    MUX_TOKEN_SECRET: z.string(),
    MUX_WEBHOOK_SECRET: z.string(),
    RESEND_API_KEY: z.string(),
    SESSION_SECRET: z.string(),
    SKRRRT_DATABASE_URL: z.string().optional(),
  },
});

export const isDevelopment = env.VITE_ENVIRONMENT === "development";
export const isProduction = env.VITE_ENVIRONMENT === "production";
