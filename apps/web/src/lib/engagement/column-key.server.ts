import "@tanstack/react-start/server-only"
import { type AnySQLiteColumn, type SQLiteTable } from "drizzle-orm/sqlite-core"

import { invariant } from "~/lib/invariant"

/**
 * The JS property key for a column on its table. Drizzle keys `.values()` and
 * `.set()` by the table's TS property name (e.g. `postId`, `siuSetMessageId`),
 * not the SQL column name (`post_id`, `siu_set_message_id`). The registry stores
 * the column reference, so resolve the property key by identity-matching that
 * reference rather than reconstructing a `${type}Id` string.
 */
export function columnKey(table: SQLiteTable, column: AnySQLiteColumn): string {
  const entry = Object.entries(
    table as unknown as Record<string, AnySQLiteColumn>,
  ).find(([, col]) => col === column)
  invariant(entry, `could not resolve a JS key for column "${column.name}"`)
  return entry[0]
}
