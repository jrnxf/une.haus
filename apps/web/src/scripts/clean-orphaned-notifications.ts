import postgres from "postgres"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("Set DATABASE_URL in .env")
  process.exit(1)
}

const sql = postgres(databaseUrl)

const entityChecks = [
  { entityType: "post", table: "posts" },
  { entityType: "riuSet", table: "riu_sets" },
  { entityType: "riuSubmission", table: "riu_submissions" },
  { entityType: "biuSet", table: "biu_sets" },
  { entityType: "siuSet", table: "siu_sets" },
  { entityType: "siu", table: "sius" },
  { entityType: "utvVideo", table: "utv_videos" },
  { entityType: "utvVideoSuggestion", table: "utv_video_suggestions" },
  { entityType: "user", table: "users" },
  { entityType: "trickSubmission", table: "trick_submissions" },
  { entityType: "trickSuggestion", table: "trick_suggestions" },
  { entityType: "trickVideo", table: "trick_videos" },
  { entityType: "glossaryProposal", table: "glossary_proposals" },
] as const

let totalDeleted = 0

for (const { entityType, table } of entityChecks) {
  const orphans = await sql`
    SELECT n.entity_id, COUNT(*)::int AS count
    FROM notifications n
    LEFT JOIN ${sql(table)} t ON n.entity_id = t.id
    WHERE n.entity_type = ${entityType} AND t.id IS NULL
    GROUP BY n.entity_id
  `

  if (orphans.length === 0) continue

  const orphanCount = orphans.reduce((sum, r) => sum + r.count, 0)

  const entityIds = orphans.map((r) => r.entity_id)
  await sql`
    DELETE FROM notifications
    WHERE entity_type = ${entityType} AND entity_id IN ${sql(entityIds)}
  `

  console.log(
    `  deleted ${orphanCount} orphaned notifications for ${entityType} (entity IDs: ${entityIds.join(", ")})`,
  )
  totalDeleted += orphanCount
}

if (totalDeleted === 0) {
  console.log("no orphaned notifications found")
} else {
  console.log(`\ndeleted ${totalDeleted} orphaned notifications total`)
}

await sql.end()
