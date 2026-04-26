import { sql } from "drizzle-orm"

import { db } from "~/db"
import { muxVideos, users } from "~/db/schema"

// Safety: integration tests must run inside the ephemeral Docker container
// started by run-integration-tests.ts. Running them directly (e.g.
// `bun test foo.integration.test.ts`) would hit your dev database and wipe it.
if (process.env.INTEGRATION_TEST_DOCKER !== "true") {
  throw new Error(
    "FATAL: Integration tests must be run via `bun run test:integration`.\n" +
      "Running them directly uses your dev DATABASE_URL and truncates all tables.\n" +
      "The test:integration script spins up an ephemeral Docker Postgres container.",
  )
}

const dbUrl = process.env.DATABASE_URL ?? ""
if (dbUrl.includes("neon.tech") || dbUrl.includes("production")) {
  throw new Error(
    `FATAL: Integration tests are pointing at a production database!\nDATABASE_URL: ${dbUrl}`,
  )
}

// Final safeguard: verify at the connection level that we're actually talking
// to the Docker container. This catches any env leak the static checks miss.
const dbCheck = await db.execute<{ current_database: string }>(
  sql`SELECT current_database()`,
)
const current_database = dbCheck.rows[0]?.current_database
if (current_database !== "unehaus_test") {
  throw new Error(
    `FATAL: Integration tests connected to "${current_database}", expected "unehaus_test".\n` +
      `DATABASE_URL: ${process.env.DATABASE_URL}`,
  )
}

export async function truncatePublicTables() {
  const result = await db.execute<{ tablename: string }>(
    sql`
      select tablename
      from pg_tables
      where schemaname = 'public'
    `,
  )

  const tableNames = result.rows
    .map((row) => row.tablename)
    .filter((name) => name !== "__drizzle_migrations")

  if (tableNames.length === 0) {
    return
  }

  await db.execute(
    sql.raw(
      `TRUNCATE TABLE ${tableNames.map((name) => `"public"."${name}"`).join(", ")} RESTART IDENTITY CASCADE`,
    ),
  )
}

export async function waitFor(
  assertion: () => Promise<void>,
  timeoutMs = 2000,
) {
  const startedAt = Date.now()
  let lastError: unknown

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await assertion()
      return
    } catch (error) {
      lastError = error
      await Bun.sleep(50)
    }
  }

  throw lastError
}

export function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}`
}

export async function seedUser(
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const email = overrides.email ?? `${randomId("user")}@example.com`

  const [user] = await db
    .insert(users)
    .values({
      avatarId: null,
      disciplines: [],
      email,
      name: overrides.name ?? email.split("@")[0]!,
      type: overrides.type ?? "user",
      ...overrides,
    })
    .returning()

  return user
}

export async function seedMuxVideo(assetId = randomId("asset")) {
  const [video] = await db
    .insert(muxVideos)
    .values({
      assetId,
      playbackId: `playback-${assetId}`,
    })
    .returning()

  return video
}

export function asUser(user: {
  avatarId: string | null
  id: number
  name: string
}) {
  return {
    context: {
      user: {
        avatarId: user.avatarId,
        id: user.id,
        name: user.name,
      },
    },
  }
}
