import { z } from "zod";

const serverSchema = z.object({
  DATABASE_HOST: z.string(),
  DATABASE_NAME: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_URL: z.string(),
  DATABASE_USER: z.string(),
  GOOGLE_API_KEY: z.string(),
  HAUS_AWS_ACCESS_KEY_ID: z.string(),
  HAUS_AWS_BUCKET_NAME: z.string(),
  HAUS_AWS_REGION: z.string(),
  HAUS_AWS_SECRET_ACCESS_KEY: z.string(),
  LOG_SQL: z.coerce.boolean().default(false),
  MUX_TOKEN_ID: z.string(),
  MUX_TOKEN_SECRET: z.string(),
  MUX_WEBHOOK_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  SESSION_SECRET: z.string(),
  SKRRRT_DATABASE_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
});

export const env = serverSchema.parse(process.env);

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
