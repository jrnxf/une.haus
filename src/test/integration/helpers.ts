import { sql } from "drizzle-orm"

import { db } from "~/db"
import { muxVideos, users } from "~/db/schema"

export async function truncatePublicTables() {
  const rows = await db.execute(
    sql<{ tablename: string }>`
      select tablename
      from pg_tables
      where schemaname = 'public'
    `,
  )

  const tableNames = rows
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
