import { sql } from "drizzle-orm"

import { db } from "~/db"
import { muxVideos, users } from "~/db/schema"

// Safety: integration tests must run against the ephemeral sqlite file
// created by run-integration-tests.ts. Running them directly (e.g.
// `bun test foo.integration.test.ts`) would hit your dev database and wipe it.
if (process.env.INTEGRATION_TEST_DB !== "true") {
  throw new Error(
    "FATAL: Integration tests must be run via `bun run test:integration`.\n" +
      "Running them directly uses your dev DATABASE_URL and truncates all tables.\n" +
      "The test:integration script creates an ephemeral sqlite database.",
  )
}

const dbUrl = process.env.DATABASE_URL ?? ""
if (!dbUrl.includes("unehaus-integration-test")) {
  throw new Error(
    `FATAL: Integration tests are not pointing at an ephemeral test database!\nDATABASE_URL: ${dbUrl}`,
  )
}

export async function truncatePublicTables() {
  const rows = (await db.all(
    sql`SELECT name FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
          AND name NOT LIKE '\\_\\_drizzle%' ESCAPE '\\'
          AND name != 'sqlite_sequence'`,
  )) as { name: string }[]

  const tableNames = rows.map((row) => row.name)

  if (tableNames.length === 0) {
    return
  }

  // Each DELETE autocommits, so FK deferral can't help — switch enforcement
  // off for the wipe (this is the whole point of the truncate helper).
  await db.run(sql.raw("PRAGMA foreign_keys = OFF"))
  for (const name of tableNames) {
    await db.run(sql.raw(`DELETE FROM "${name}"`))
  }
  // RESTART IDENTITY equivalent: reset AUTOINCREMENT counters.
  await db.run(sql.raw("DELETE FROM sqlite_sequence"))
  await db.run(sql.raw("PRAGMA foreign_keys = ON"))
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

// Assert a DB operation rejects with a driver error matching `pattern`.
// drizzle wraps driver errors in DrizzleQueryError whose message omits the
// constraint name, so match against the full cause chain.
export async function expectDbRejection(
  operation: Promise<unknown>,
  pattern: RegExp | string,
) {
  const error = await operation.then(
    () => {
      throw new Error("expected operation to reject, but it resolved")
    },
    (err: unknown) => err,
  )

  const chain: string[] = []
  let current: unknown = error
  while (current instanceof Error) {
    chain.push(current.message)
    current = current.cause
  }

  const haystack = chain.join(" | ")
  const matches =
    typeof pattern === "string"
      ? haystack.includes(pattern)
      : pattern.test(haystack)

  if (!matches) {
    throw new Error(
      `expected rejection matching ${String(pattern)}, got: ${haystack}`,
    )
  }
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
