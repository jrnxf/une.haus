import { describe, expect, it } from "bun:test"
import { getTableName, sql } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/pg-core"

import { db } from "~/db"
import {
  ENTITY_REGISTRY,
  type EngagementEntityType,
} from "~/lib/engagement/registry.server"
// Side-effect import: runs the guard that aborts if we're not pointed at the
// ephemeral Docker test database.
import "~/testing/integration"

const entries = Object.entries(ENTITY_REGISTRY) as [
  EngagementEntityType,
  (typeof ENTITY_REGISTRY)[EngagementEntityType],
][]

describe("engagement registry schema coverage", () => {
  it("has a registry entry for every *_likes / *_messages table in the catalog", async () => {
    const rows = await db.execute<{ tablename: string }>(
      sql`
        select tablename
        from pg_tables
        where schemaname = 'public'
          and tablename ~ '_(likes|messages)$'
      `,
    )
    const catalog = new Set(rows.map((row) => row.tablename))

    // Tables claimed by the registry: every entry's likes table and message table.
    const claimed = new Set<string>()
    for (const [, binding] of entries) {
      claimed.add(getTableName(binding.likesTable))
      claimed.add(getTableName(binding.messageTable))
    }

    // Every engagement table in the DB must be owned by a registry entry —
    // catches "added a table, forgot the registry row".
    const uncovered = [...catalog]
      .filter((name) => !claimed.has(name))
      .toSorted()
    expect(uncovered).toEqual([])

    // And the registry must not reference tables that don't exist.
    const phantom = [...claimed].filter((name) => !catalog.has(name)).toSorted()
    expect(phantom).toEqual([])
  })

  it("names a real foreign-key column on each likes table (no runtime string construction)", () => {
    for (const [type, binding] of entries) {
      const { columns } = getTableConfig(binding.likesTable)
      const hasColumn = columns.some(
        (col) => col.name === binding.fkColumn.name,
      )
      expect(hasColumn, `${type}: fkColumn must exist on its likes table`).toBe(
        true,
      )
    }
  })

  it("classifies likes tables as *_likes and message tables as *_messages", () => {
    for (const [type, binding] of entries) {
      expect(
        getTableName(binding.likesTable).endsWith("_likes"),
        `${type}: likesTable must be a *_likes table`,
      ).toBe(true)
      expect(
        getTableName(binding.messageTable).endsWith("_messages"),
        `${type}: messageTable must be a *_messages table`,
      ).toBe(true)
    }
  })
})
