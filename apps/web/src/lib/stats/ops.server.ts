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

export async function getStats() {
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
    db.execute<{ month: string; activityCount: number }>(sql`
      WITH monthly_activity AS (
        SELECT DATE_TRUNC('month', created_at) as month, 'post' as type FROM posts
        UNION ALL
        SELECT DATE_TRUNC('month', created_at) as month, 'message' as type FROM chat_messages
        UNION ALL
        SELECT DATE_TRUNC('month', created_at) as month, 'set' as type FROM riu_sets
        UNION ALL
        SELECT DATE_TRUNC('month', created_at) as month, 'submission' as type FROM riu_submissions
      )
      SELECT
        TO_CHAR(month, 'YYYY-MM') as month,
        COUNT(*) as "activityCount"
      FROM monthly_activity
      GROUP BY month
      ORDER BY month ASC
    `),
    db.execute<{ discipline: string; count: number }>(sql`
      SELECT
        discipline,
        COUNT(*) as count
      FROM users,
        jsonb_array_elements_text(disciplines::jsonb) as discipline
      WHERE disciplines IS NOT NULL
      GROUP BY discipline
      ORDER BY count DESC
    `),
    db.execute<{
      id: number
      name: string
      avatarId: string | null
      contentCount: number
      messagesCount: number
      likesCount: number
      totalPoints: number
    }>(sql`
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
          SELECT user_id FROM riu_sets
          UNION ALL SELECT user_id FROM riu_submissions
          UNION ALL SELECT user_id FROM biu_sets
          UNION ALL SELECT user_id FROM siu_sets
          UNION ALL SELECT user_id FROM posts
          UNION ALL SELECT submitted_by_user_id as user_id FROM trick_submissions
          UNION ALL SELECT submitted_by_user_id as user_id FROM trick_suggestions
          UNION ALL SELECT submitted_by_user_id as user_id FROM trick_videos
          UNION ALL SELECT submitted_by_user_id as user_id FROM utv_video_suggestions
        ) all_content GROUP BY user_id
      ) content ON u.id = content.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as count FROM (
          SELECT user_id FROM chat_messages
          UNION ALL SELECT user_id FROM post_messages
          UNION ALL SELECT user_id FROM riu_set_messages
          UNION ALL SELECT user_id FROM riu_submission_messages
          UNION ALL SELECT user_id FROM biu_set_messages
          UNION ALL SELECT user_id FROM siu_set_messages
          UNION ALL SELECT user_id FROM utv_video_messages
          UNION ALL SELECT user_id FROM trick_messages
        ) all_msgs GROUP BY user_id
      ) msgs ON u.id = msgs.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as count FROM (
          SELECT user_id FROM post_likes
          UNION ALL SELECT user_id FROM riu_set_likes
          UNION ALL SELECT user_id FROM riu_submission_likes
          UNION ALL SELECT user_id FROM biu_set_likes
          UNION ALL SELECT user_id FROM siu_set_likes
          UNION ALL SELECT user_id FROM chat_message_likes
          UNION ALL SELECT user_id FROM utv_video_likes
          UNION ALL SELECT user_id FROM post_message_likes
          UNION ALL SELECT user_id FROM riu_set_message_likes
          UNION ALL SELECT user_id FROM riu_submission_message_likes
          UNION ALL SELECT user_id FROM biu_set_message_likes
          UNION ALL SELECT user_id FROM siu_set_message_likes
          UNION ALL SELECT user_id FROM utv_video_message_likes
          UNION ALL SELECT user_id FROM trick_likes
          UNION ALL SELECT user_id FROM trick_message_likes
        ) all_likes GROUP BY user_id
      ) likes ON u.id = likes.user_id
      WHERE (COALESCE(content.count, 0) * 5) + (COALESCE(msgs.count, 0) * 2) + COALESCE(likes.count, 0) > 0
      ORDER BY "totalPoints" DESC
      LIMIT 5
    `),
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
    activityByMonth: activityByMonthResult.rows.map((row) => ({
      month: row.month,
      activityCount: Number(row.activityCount),
    })),
    disciplineDistribution: disciplineDistributionResult.rows.map((row) => ({
      discipline: row.discipline,
      count: Number(row.count),
    })),
    topContributors: topContributorsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      avatarId: row.avatarId,
      contentCount: Number(row.contentCount),
      messagesCount: Number(row.messagesCount),
      likesCount: Number(row.likesCount),
      totalPoints: Number(row.totalPoints),
    })),
    usersOnline: null,
  }
}

export async function getContributors() {
  const contributorsResult = await db.execute<{
    id: number
    name: string
    avatarId: string | null
    contentCount: number
    messagesCount: number
    likesCount: number
    totalPoints: number
  }>(sql`
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
        SELECT user_id FROM riu_sets
        UNION ALL SELECT user_id FROM riu_submissions
        UNION ALL SELECT user_id FROM biu_sets
        UNION ALL SELECT user_id FROM siu_sets
        UNION ALL SELECT user_id FROM posts
        UNION ALL SELECT submitted_by_user_id as user_id FROM trick_submissions
        UNION ALL SELECT submitted_by_user_id as user_id FROM trick_suggestions
        UNION ALL SELECT submitted_by_user_id as user_id FROM trick_videos
        UNION ALL SELECT submitted_by_user_id as user_id FROM utv_video_suggestions
      ) all_content GROUP BY user_id
    ) content ON u.id = content.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as count FROM (
        SELECT user_id FROM chat_messages
        UNION ALL SELECT user_id FROM post_messages
        UNION ALL SELECT user_id FROM riu_set_messages
        UNION ALL SELECT user_id FROM riu_submission_messages
        UNION ALL SELECT user_id FROM biu_set_messages
        UNION ALL SELECT user_id FROM siu_set_messages
        UNION ALL SELECT user_id FROM utv_video_messages
        UNION ALL SELECT user_id FROM trick_messages
      ) all_msgs GROUP BY user_id
    ) msgs ON u.id = msgs.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as count FROM (
        SELECT user_id FROM post_likes
        UNION ALL SELECT user_id FROM riu_set_likes
        UNION ALL SELECT user_id FROM riu_submission_likes
        UNION ALL SELECT user_id FROM biu_set_likes
        UNION ALL SELECT user_id FROM siu_set_likes
        UNION ALL SELECT user_id FROM chat_message_likes
        UNION ALL SELECT user_id FROM utv_video_likes
        UNION ALL SELECT user_id FROM post_message_likes
        UNION ALL SELECT user_id FROM riu_set_message_likes
        UNION ALL SELECT user_id FROM riu_submission_message_likes
        UNION ALL SELECT user_id FROM biu_set_message_likes
        UNION ALL SELECT user_id FROM siu_set_message_likes
        UNION ALL SELECT user_id FROM utv_video_message_likes
        UNION ALL SELECT user_id FROM trick_likes
        UNION ALL SELECT user_id FROM trick_message_likes
      ) all_likes GROUP BY user_id
    ) likes ON u.id = likes.user_id
    WHERE (COALESCE(content.count, 0) * 5) + (COALESCE(msgs.count, 0) * 2) + COALESCE(likes.count, 0) > 0
    ORDER BY "totalPoints" DESC
  `)

  return contributorsResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    avatarId: row.avatarId,
    contentCount: Number(row.contentCount),
    messagesCount: Number(row.messagesCount),
    likesCount: Number(row.likesCount),
    totalPoints: Number(row.totalPoints),
  }))
}
