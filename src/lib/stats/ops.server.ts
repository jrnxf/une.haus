import "@tanstack/react-start/server-only"
import { count, countDistinct, eq, sql } from "drizzle-orm"

import { db } from "~/db"
import {
  biuSetLikes,
  biuSetMessageLikes,
  biuSetMessages,
  chatMessageLikes,
  chatMessages,
  muxVideos,
  postLikes,
  postMessageLikes,
  postMessages,
  posts,
  riuSetLikes,
  riuSetMessageLikes,
  riuSetMessages,
  riuSets,
  riuSubmissionLikes,
  riuSubmissionMessageLikes,
  riuSubmissionMessages,
  riuSubmissions,
  rius,
  siuSetLikes,
  siuSetMessageLikes,
  siuSetMessages,
  trickLikes,
  trickMessageLikes,
  trickMessages,
  userLocations,
  users,
  utvVideoLikes,
  utvVideoMessageLikes,
  utvVideoMessages,
} from "~/db/schema"
import { ttlCache } from "~/lib/ttl-cache"

// D1 rejects compound SELECTs with more than 5 terms, so long UNION ALL
// chains must be nested into subselects of at most 5 terms each.
const D1_MAX_COMPOUND_TERMS = 5

function unionAllChunked(selects: string[]): string {
  if (selects.length <= D1_MAX_COMPOUND_TERMS) {
    return selects.join(" UNION ALL ")
  }
  const chunks: string[][] = []
  for (let i = 0; i < selects.length; i += D1_MAX_COMPOUND_TERMS) {
    chunks.push(selects.slice(i, i + D1_MAX_COMPOUND_TERMS))
  }
  return unionAllChunked(
    chunks.map((chunk) => `SELECT * FROM (${chunk.join(" UNION ALL ")})`),
  )
}

const CONTENT_SELECTS = [
  "SELECT user_id FROM riu_sets",
  "SELECT user_id FROM riu_submissions",
  "SELECT user_id FROM biu_sets",
  "SELECT user_id FROM siu_sets",
  "SELECT user_id FROM posts",
  "SELECT submitted_by_user_id as user_id FROM trick_submissions",
  "SELECT submitted_by_user_id as user_id FROM trick_suggestions",
  "SELECT submitted_by_user_id as user_id FROM trick_videos",
  "SELECT submitted_by_user_id as user_id FROM utv_video_suggestions",
]

const MESSAGE_SELECTS = [
  "SELECT user_id FROM chat_messages",
  "SELECT user_id FROM post_messages",
  "SELECT user_id FROM riu_set_messages",
  "SELECT user_id FROM riu_submission_messages",
  "SELECT user_id FROM biu_set_messages",
  "SELECT user_id FROM siu_set_messages",
  "SELECT user_id FROM utv_video_messages",
  "SELECT user_id FROM trick_messages",
]

const LIKE_SELECTS = [
  "SELECT user_id FROM post_likes",
  "SELECT user_id FROM riu_set_likes",
  "SELECT user_id FROM riu_submission_likes",
  "SELECT user_id FROM biu_set_likes",
  "SELECT user_id FROM siu_set_likes",
  "SELECT user_id FROM chat_message_likes",
  "SELECT user_id FROM utv_video_likes",
  "SELECT user_id FROM post_message_likes",
  "SELECT user_id FROM riu_set_message_likes",
  "SELECT user_id FROM riu_submission_message_likes",
  "SELECT user_id FROM biu_set_message_likes",
  "SELECT user_id FROM siu_set_message_likes",
  "SELECT user_id FROM utv_video_message_likes",
  "SELECT user_id FROM trick_likes",
  "SELECT user_id FROM trick_message_likes",
]

type ContributorRow = {
  id: number
  name: string
  avatarId: string | null
  contentCount: number
  messagesCount: number
  likesCount: number
  totalPoints: number
}

function contributorsSql(limit?: number) {
  return sql.raw(`
    SELECT
      u.id,
      u.name,
      u.avatar_id as "avatarId",
      COALESCE(content.count, 0) as "contentCount",
      COALESCE(msgs.count, 0) as "messagesCount",
      COALESCE(likes.count, 0) as "likesCount",
      (COALESCE(content.count, 0) * 5) + (COALESCE(msgs.count, 0) * 2) + COALESCE(likes.count, 0) as "totalPoints"
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) as count FROM (
        ${unionAllChunked(CONTENT_SELECTS)}
      ) all_content GROUP BY user_id
    ) content ON u.id = content.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as count FROM (
        ${unionAllChunked(MESSAGE_SELECTS)}
      ) all_msgs GROUP BY user_id
    ) msgs ON u.id = msgs.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as count FROM (
        ${unionAllChunked(LIKE_SELECTS)}
      ) all_likes GROUP BY user_id
    ) likes ON u.id = likes.user_id
    WHERE (COALESCE(content.count, 0) * 5) + (COALESCE(msgs.count, 0) * 2) + COALESCE(likes.count, 0) > 0
    ORDER BY "totalPoints" DESC
    ${limit ? `LIMIT ${limit}` : ""}
  `)
}

function mapContributorRow(row: ContributorRow) {
  return {
    id: row.id,
    name: row.name,
    avatarId: row.avatarId,
    contentCount: Number(row.contentCount),
    messagesCount: Number(row.messagesCount),
    likesCount: Number(row.likesCount),
    totalPoints: Number(row.totalPoints),
  }
}

async function computeStats() {
  const [
    usersResult,
    postsResult,
    usersOnMapResult,
    countriesResult,
    riuSetsResult,
    riuSubmissionsResult,
    activeRiuResult,
    postLikesResult,
    riuSetLikesResult,
    riuSubmissionLikesResult,
    biuSetLikesResult,
    siuSetLikesResult,
    chatMessageLikesResult,
    utvVideoLikesResult,
    postMessageLikesResult,
    riuSetMessageLikesResult,
    riuSubmissionMessageLikesResult,
    biuSetMessageLikesResult,
    siuSetMessageLikesResult,
    utvVideoMessageLikesResult,
    trickLikesResult,
    trickMessageLikesResult,
    postMessagesResult,
    chatMessagesResult,
    riuSetMessagesResult,
    riuSubmissionMessagesResult,
    biuSetMessagesResult,
    siuSetMessagesResult,
    utvVideoMessagesResult,
    trickMessagesResult,
    videoUploadsResult,
    activityByMonthResult,
    disciplineDistributionResult,
    topContributorsResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(posts),
    db.select({ count: count() }).from(userLocations),
    db
      .select({ count: countDistinct(userLocations.countryCode) })
      .from(userLocations),
    db.select({ count: count() }).from(riuSets),
    db.select({ count: count() }).from(riuSubmissions),
    db
      .select({ id: rius.id, startedAt: rius.startedAt })
      .from(rius)
      .where(eq(rius.status, "active"))
      .limit(1),
    db.select({ count: count() }).from(postLikes),
    db.select({ count: count() }).from(riuSetLikes),
    db.select({ count: count() }).from(riuSubmissionLikes),
    db.select({ count: count() }).from(biuSetLikes),
    db.select({ count: count() }).from(siuSetLikes),
    db.select({ count: count() }).from(chatMessageLikes),
    db.select({ count: count() }).from(utvVideoLikes),
    db.select({ count: count() }).from(postMessageLikes),
    db.select({ count: count() }).from(riuSetMessageLikes),
    db.select({ count: count() }).from(riuSubmissionMessageLikes),
    db.select({ count: count() }).from(biuSetMessageLikes),
    db.select({ count: count() }).from(siuSetMessageLikes),
    db.select({ count: count() }).from(utvVideoMessageLikes),
    db.select({ count: count() }).from(trickLikes),
    db.select({ count: count() }).from(trickMessageLikes),
    db.select({ count: count() }).from(postMessages),
    db.select({ count: count() }).from(chatMessages),
    db.select({ count: count() }).from(riuSetMessages),
    db.select({ count: count() }).from(riuSubmissionMessages),
    db.select({ count: count() }).from(biuSetMessages),
    db.select({ count: count() }).from(siuSetMessages),
    db.select({ count: count() }).from(utvVideoMessages),
    db.select({ count: count() }).from(trickMessages),
    db.select({ count: count() }).from(muxVideos),
    db.all(sql`
      WITH monthly_activity AS (
        SELECT strftime('%Y-%m', created_at / 1000, 'unixepoch') as month FROM posts
        UNION ALL
        SELECT strftime('%Y-%m', created_at / 1000, 'unixepoch') as month FROM chat_messages
        UNION ALL
        SELECT strftime('%Y-%m', created_at / 1000, 'unixepoch') as month FROM riu_sets
        UNION ALL
        SELECT strftime('%Y-%m', created_at / 1000, 'unixepoch') as month FROM riu_submissions
      )
      SELECT
        month,
        COUNT(*) as "activityCount"
      FROM monthly_activity
      GROUP BY month
      ORDER BY month ASC
    `) as Promise<{ month: string; activityCount: number }[]>,
    db.all(sql`
      SELECT
        je.value as discipline,
        COUNT(*) as count
      FROM users, json_each(users.disciplines) as je
      WHERE users.disciplines IS NOT NULL
      GROUP BY je.value
      ORDER BY count DESC
    `) as Promise<{ discipline: string; count: number }[]>,
    db.all(contributorsSql(5)) as Promise<ContributorRow[]>,
  ])

  const totalLikes =
    (postLikesResult[0]?.count ?? 0) +
    (riuSetLikesResult[0]?.count ?? 0) +
    (riuSubmissionLikesResult[0]?.count ?? 0) +
    (biuSetLikesResult[0]?.count ?? 0) +
    (siuSetLikesResult[0]?.count ?? 0) +
    (chatMessageLikesResult[0]?.count ?? 0) +
    (utvVideoLikesResult[0]?.count ?? 0) +
    (postMessageLikesResult[0]?.count ?? 0) +
    (riuSetMessageLikesResult[0]?.count ?? 0) +
    (riuSubmissionMessageLikesResult[0]?.count ?? 0) +
    (biuSetMessageLikesResult[0]?.count ?? 0) +
    (siuSetMessageLikesResult[0]?.count ?? 0) +
    (utvVideoMessageLikesResult[0]?.count ?? 0) +
    (trickLikesResult[0]?.count ?? 0) +
    (trickMessageLikesResult[0]?.count ?? 0)

  const totalMessages =
    (postMessagesResult[0]?.count ?? 0) +
    (chatMessagesResult[0]?.count ?? 0) +
    (riuSetMessagesResult[0]?.count ?? 0) +
    (riuSubmissionMessagesResult[0]?.count ?? 0) +
    (biuSetMessagesResult[0]?.count ?? 0) +
    (siuSetMessagesResult[0]?.count ?? 0) +
    (utvVideoMessagesResult[0]?.count ?? 0) +
    (trickMessagesResult[0]?.count ?? 0)

  return {
    counts: {
      users: usersResult[0]?.count ?? 0,
      posts: postsResult[0]?.count ?? 0,
      usersOnMap: usersOnMapResult[0]?.count ?? 0,
      countries: countriesResult[0]?.count ?? 0,
      riuSets: riuSetsResult[0]?.count ?? 0,
      riuSubmissions: riuSubmissionsResult[0]?.count ?? 0,
      totalLikes,
      totalMessages,
      videoUploads: videoUploadsResult[0]?.count ?? 0,
    },
    activeRiu: activeRiuResult[0] ?? null,
    activityByMonth: activityByMonthResult.map((row) => ({
      month: row.month,
      activityCount: Number(row.activityCount),
    })),
    disciplineDistribution: disciplineDistributionResult.map((row) => ({
      discipline: row.discipline,
      count: Number(row.count),
    })),
    topContributors: topContributorsResult.map(mapContributorRow),
    usersOnline: null,
  }
}

async function computeContributors() {
  const contributorsResult = (await db.all(
    contributorsSql(),
  )) as ContributorRow[]

  return contributorsResult.map(mapContributorRow)
}

const STATS_TTL_MS = 5 * 60 * 1000

const statsCache = ttlCache(computeStats, STATS_TTL_MS)
const contributorsCache = ttlCache(computeContributors, STATS_TTL_MS)

export async function getStats() {
  return statsCache.get()
}

export async function getContributors() {
  return contributorsCache.get()
}

/** test-only: reset both caches */
export function clearStatsCaches() {
  statsCache.clear()
  contributorsCache.clear()
}
