import "@tanstack/react-start/server-only"
import { count, eq, isNull } from "drizzle-orm"

import { db } from "~/db"
import {
  flags,
  glossaryProposals,
  trickSubmissions,
  trickSuggestions,
  trickVideos,
  utvVideoSuggestions,
} from "~/db/schema"

export async function getPendingCount() {
  const [submissions, suggestions, videos, proposals, utvSuggestions, pending] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(trickSubmissions)
        .where(eq(trickSubmissions.status, "pending")),
      db
        .select({ count: count() })
        .from(trickSuggestions)
        .where(eq(trickSuggestions.status, "pending")),
      db
        .select({ count: count() })
        .from(trickVideos)
        .where(eq(trickVideos.status, "pending")),
      db
        .select({ count: count() })
        .from(glossaryProposals)
        .where(eq(glossaryProposals.status, "pending")),
      db
        .select({ count: count() })
        .from(utvVideoSuggestions)
        .where(eq(utvVideoSuggestions.status, "pending")),
      db.select({ count: count() }).from(flags).where(isNull(flags.resolvedAt)),
    ])

  return (
    (submissions[0]?.count ?? 0) +
    (suggestions[0]?.count ?? 0) +
    (videos[0]?.count ?? 0) +
    (proposals[0]?.count ?? 0) +
    (utvSuggestions[0]?.count ?? 0) +
    (pending[0]?.count ?? 0)
  )
}
