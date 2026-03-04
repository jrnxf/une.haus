import { inArray } from "drizzle-orm"

import { extractMentionedUserIds, stripMentionTokens } from "./parse"
import { db } from "~/db"
import { users } from "~/db/schema"

/** Resolve @[userId] tokens to @name using a DB lookup, truncated to 100 chars */
export async function resolvePreview(content: string): Promise<string> {
  const ids = extractMentionedUserIds(content)
  if (ids.length === 0) return content.slice(0, 100)

  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, ids))

  const nameMap = new Map(rows.map((r) => [r.id, r.name]))

  return stripMentionTokens(
    content,
    (id) => nameMap.get(id) ?? undefined,
  ).slice(0, 100)
}
