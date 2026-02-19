import { createServerFn } from "@tanstack/react-start";

import { count, countDistinct, eq, sql } from "drizzle-orm";

import { db } from "~/db";
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
  rius,
  riuSetLikes,
  riuSetMessageLikes,
  riuSetMessages,
  riuSets,
  riuSubmissionLikes,
  riuSubmissionMessageLikes,
  riuSubmissionMessages,
  riuSubmissions,
  siuStackLikes,
  siuStackMessageLikes,
  siuStackMessages,
  trickLikes,
  trickMessageLikes,
  trickSubmissionLikes,
  trickSubmissionMessageLikes,
  trickSubmissionMessages,
  trickSuggestionLikes,
  trickSuggestionMessageLikes,
  trickSuggestionMessages,
  trickVideoLikes,
  trickVideoMessageLikes,
  trickVideoMessages,
  trickMessages,
  userLocations,
  users,
  utvVideoLikes,
  utvVideoMessageLikes,
  utvVideoMessages,
  utvVideoSuggestionLikes,
  utvVideoSuggestionMessageLikes,
  utvVideoSuggestionMessages,
} from "~/db/schema";

export const getStatsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const [
    // Core counts
    usersResult,
    postsResult,
    usersOnMapResult,
    countriesResult,

    // Game counts
    riuSetsResult,
    riuSubmissionsResult,
    activeRiuResult,

    // Engagement totals (aggregated from multiple tables)
    postLikesResult,
    riuSetLikesResult,
    riuSubmissionLikesResult,
    biuSetLikesResult,
    siuStackLikesResult,
    chatMessageLikesResult,
    utvVideoLikesResult,
    postMessageLikesResult,
    riuSetMessageLikesResult,
    riuSubmissionMessageLikesResult,
    biuSetMessageLikesResult,
    siuStackMessageLikesResult,
    utvVideoMessageLikesResult,
    utvVideoSuggestionLikesResult,
    utvVideoSuggestionMessageLikesResult,
    trickLikesResult,
    trickMessageLikesResult,
    trickVideoLikesResult,
    trickVideoMessageLikesResult,
    trickSubmissionLikesResult,
    trickSubmissionMessageLikesResult,
    trickSuggestionLikesResult,
    trickSuggestionMessageLikesResult,

    // Message counts
    postMessagesResult,
    chatMessagesResult,
    riuSetMessagesResult,
    riuSubmissionMessagesResult,
    biuSetMessagesResult,
    siuStackMessagesResult,
    utvVideoMessagesResult,
    utvVideoSuggestionMessagesResult,
    trickMessagesResult,
    trickVideoMessagesResult,
    trickSubmissionMessagesResult,
    trickSuggestionMessagesResult,

    // Video uploads
    videoUploadsResult,

    // Activity over time (monthly)
    activityByMonthResult,

    // Discipline distribution
    disciplineDistributionResult,

    // Top contributors
    topContributorsResult,
  ] = await Promise.all([
    // Users count
    db.select({ count: count() }).from(users),

    // Posts count
    db.select({ count: count() }).from(posts),

    // Users with location
    db.select({ count: count() }).from(userLocations),

    // Distinct countries
    db
      .select({ count: countDistinct(userLocations.countryCode) })
      .from(userLocations),

    // RIU sets count
    db.select({ count: count() }).from(riuSets),

    // RIU submissions count
    db.select({ count: count() }).from(riuSubmissions),

    // Active RIU
    db
      .select({
        id: rius.id,
        startedAt: rius.startedAt,
      })
      .from(rius)
      .where(eq(rius.status, "active"))
      .limit(1),

    // Like counts from each table
    db.select({ count: count() }).from(postLikes),
    db.select({ count: count() }).from(riuSetLikes),
    db.select({ count: count() }).from(riuSubmissionLikes),
    db.select({ count: count() }).from(biuSetLikes),
    db.select({ count: count() }).from(siuStackLikes),
    db.select({ count: count() }).from(chatMessageLikes),
    db.select({ count: count() }).from(utvVideoLikes),
    db.select({ count: count() }).from(postMessageLikes),
    db.select({ count: count() }).from(riuSetMessageLikes),
    db.select({ count: count() }).from(riuSubmissionMessageLikes),
    db.select({ count: count() }).from(biuSetMessageLikes),
    db.select({ count: count() }).from(siuStackMessageLikes),
    db.select({ count: count() }).from(utvVideoMessageLikes),
    db.select({ count: count() }).from(utvVideoSuggestionLikes),
    db.select({ count: count() }).from(utvVideoSuggestionMessageLikes),
    db.select({ count: count() }).from(trickLikes),
    db.select({ count: count() }).from(trickMessageLikes),
    db.select({ count: count() }).from(trickVideoLikes),
    db.select({ count: count() }).from(trickVideoMessageLikes),
    db.select({ count: count() }).from(trickSubmissionLikes),
    db.select({ count: count() }).from(trickSubmissionMessageLikes),
    db.select({ count: count() }).from(trickSuggestionLikes),
    db.select({ count: count() }).from(trickSuggestionMessageLikes),

    // Message counts from each table
    db.select({ count: count() }).from(postMessages),
    db.select({ count: count() }).from(chatMessages),
    db.select({ count: count() }).from(riuSetMessages),
    db.select({ count: count() }).from(riuSubmissionMessages),
    db.select({ count: count() }).from(biuSetMessages),
    db.select({ count: count() }).from(siuStackMessages),
    db.select({ count: count() }).from(utvVideoMessages),
    db.select({ count: count() }).from(utvVideoSuggestionMessages),
    db.select({ count: count() }).from(trickMessages),
    db.select({ count: count() }).from(trickVideoMessages),
    db.select({ count: count() }).from(trickSubmissionMessages),
    db.select({ count: count() }).from(trickSuggestionMessages),

    // Video uploads (MUX)
    db.select({ count: count() }).from(muxVideos),

    // Activity by month (all time) - combines posts, chat messages, sets, and submissions
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

    // Discipline distribution
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

    // Top contributors (by points: content*5 + messages*2 + likes*1)
    db.execute<{
      id: number;
      name: string;
      avatarId: string | null;
      contentCount: number;
      messagesCount: number;
      likesCount: number;
      totalPoints: number;
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
          UNION ALL SELECT user_id FROM siu_stacks
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
          UNION ALL SELECT user_id FROM siu_stack_messages
          UNION ALL SELECT user_id FROM utv_video_messages
          UNION ALL SELECT user_id FROM utv_video_suggestion_messages
          UNION ALL SELECT user_id FROM trick_messages
          UNION ALL SELECT user_id FROM trick_video_messages
          UNION ALL SELECT user_id FROM trick_submission_messages
          UNION ALL SELECT user_id FROM trick_suggestion_messages
        ) all_msgs GROUP BY user_id
      ) msgs ON u.id = msgs.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as count FROM (
          SELECT user_id FROM post_likes
          UNION ALL SELECT user_id FROM riu_set_likes
          UNION ALL SELECT user_id FROM riu_submission_likes
          UNION ALL SELECT user_id FROM biu_set_likes
          UNION ALL SELECT user_id FROM siu_stack_likes
          UNION ALL SELECT user_id FROM chat_message_likes
          UNION ALL SELECT user_id FROM utv_video_likes
          UNION ALL SELECT user_id FROM post_message_likes
          UNION ALL SELECT user_id FROM riu_set_message_likes
          UNION ALL SELECT user_id FROM riu_submission_message_likes
          UNION ALL SELECT user_id FROM biu_set_message_likes
          UNION ALL SELECT user_id FROM siu_stack_message_likes
          UNION ALL SELECT user_id FROM utv_video_message_likes
          UNION ALL SELECT user_id FROM utv_video_suggestion_likes
          UNION ALL SELECT user_id FROM utv_video_sug_msg_likes
          UNION ALL SELECT user_id FROM trick_likes
          UNION ALL SELECT user_id FROM trick_message_likes
          UNION ALL SELECT user_id FROM trick_video_likes
          UNION ALL SELECT user_id FROM trick_video_message_likes
          UNION ALL SELECT user_id FROM trick_submission_likes
          UNION ALL SELECT user_id FROM trick_submission_message_likes
          UNION ALL SELECT user_id FROM trick_suggestion_likes
          UNION ALL SELECT user_id FROM trick_suggestion_message_likes
        ) all_likes GROUP BY user_id
      ) likes ON u.id = likes.user_id
      WHERE (COALESCE(content.count, 0) * 5) + (COALESCE(msgs.count, 0) * 2) + COALESCE(likes.count, 0) > 0
      ORDER BY "totalPoints" DESC
      LIMIT 5
    `),
  ]);

  // Aggregate total likes
  const totalLikes =
    (postLikesResult[0]?.count ?? 0) +
    (riuSetLikesResult[0]?.count ?? 0) +
    (riuSubmissionLikesResult[0]?.count ?? 0) +
    (biuSetLikesResult[0]?.count ?? 0) +
    (siuStackLikesResult[0]?.count ?? 0) +
    (chatMessageLikesResult[0]?.count ?? 0) +
    (utvVideoLikesResult[0]?.count ?? 0) +
    (postMessageLikesResult[0]?.count ?? 0) +
    (riuSetMessageLikesResult[0]?.count ?? 0) +
    (riuSubmissionMessageLikesResult[0]?.count ?? 0) +
    (biuSetMessageLikesResult[0]?.count ?? 0) +
    (siuStackMessageLikesResult[0]?.count ?? 0) +
    (utvVideoMessageLikesResult[0]?.count ?? 0) +
    (utvVideoSuggestionLikesResult[0]?.count ?? 0) +
    (utvVideoSuggestionMessageLikesResult[0]?.count ?? 0) +
    (trickLikesResult[0]?.count ?? 0) +
    (trickMessageLikesResult[0]?.count ?? 0) +
    (trickVideoLikesResult[0]?.count ?? 0) +
    (trickVideoMessageLikesResult[0]?.count ?? 0) +
    (trickSubmissionLikesResult[0]?.count ?? 0) +
    (trickSubmissionMessageLikesResult[0]?.count ?? 0) +
    (trickSuggestionLikesResult[0]?.count ?? 0) +
    (trickSuggestionMessageLikesResult[0]?.count ?? 0);

  // Aggregate total messages
  const totalMessages =
    (postMessagesResult[0]?.count ?? 0) +
    (chatMessagesResult[0]?.count ?? 0) +
    (riuSetMessagesResult[0]?.count ?? 0) +
    (riuSubmissionMessagesResult[0]?.count ?? 0) +
    (biuSetMessagesResult[0]?.count ?? 0) +
    (siuStackMessagesResult[0]?.count ?? 0) +
    (utvVideoMessagesResult[0]?.count ?? 0) +
    (utvVideoSuggestionMessagesResult[0]?.count ?? 0) +
    (trickMessagesResult[0]?.count ?? 0) +
    (trickVideoMessagesResult[0]?.count ?? 0) +
    (trickSubmissionMessagesResult[0]?.count ?? 0) +
    (trickSuggestionMessagesResult[0]?.count ?? 0);

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
    topContributors: topContributorsResult.map((row) => ({
      id: row.id,
      name: row.name,
      avatarId: row.avatarId,
      contentCount: Number(row.contentCount),
      messagesCount: Number(row.messagesCount),
      likesCount: Number(row.likesCount),
      totalPoints: Number(row.totalPoints),
    })),
    usersOnline: null, // Stub for future WebSocket feature
  };
});

// Get all contributors with detailed breakdown (points: content*5 + messages*2 + likes*1)
export const getContributorsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const contributorsResult = await db.execute<{
    id: number;
    name: string;
    avatarId: string | null;
    contentCount: number;
    messagesCount: number;
    likesCount: number;
    totalPoints: number;
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
        UNION ALL SELECT user_id FROM siu_stacks
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
        UNION ALL SELECT user_id FROM siu_stack_messages
        UNION ALL SELECT user_id FROM utv_video_messages
        UNION ALL SELECT user_id FROM utv_video_suggestion_messages
        UNION ALL SELECT user_id FROM trick_messages
        UNION ALL SELECT user_id FROM trick_video_messages
        UNION ALL SELECT user_id FROM trick_submission_messages
        UNION ALL SELECT user_id FROM trick_suggestion_messages
      ) all_msgs GROUP BY user_id
    ) msgs ON u.id = msgs.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as count FROM (
        SELECT user_id FROM post_likes
        UNION ALL SELECT user_id FROM riu_set_likes
        UNION ALL SELECT user_id FROM riu_submission_likes
        UNION ALL SELECT user_id FROM biu_set_likes
        UNION ALL SELECT user_id FROM siu_stack_likes
        UNION ALL SELECT user_id FROM chat_message_likes
        UNION ALL SELECT user_id FROM utv_video_likes
        UNION ALL SELECT user_id FROM post_message_likes
        UNION ALL SELECT user_id FROM riu_set_message_likes
        UNION ALL SELECT user_id FROM riu_submission_message_likes
        UNION ALL SELECT user_id FROM biu_set_message_likes
        UNION ALL SELECT user_id FROM siu_stack_message_likes
        UNION ALL SELECT user_id FROM utv_video_message_likes
        UNION ALL SELECT user_id FROM utv_video_suggestion_likes
        UNION ALL SELECT user_id FROM utv_video_sug_msg_likes
        UNION ALL SELECT user_id FROM trick_likes
        UNION ALL SELECT user_id FROM trick_message_likes
        UNION ALL SELECT user_id FROM trick_video_likes
        UNION ALL SELECT user_id FROM trick_video_message_likes
        UNION ALL SELECT user_id FROM trick_submission_likes
        UNION ALL SELECT user_id FROM trick_submission_message_likes
        UNION ALL SELECT user_id FROM trick_suggestion_likes
        UNION ALL SELECT user_id FROM trick_suggestion_message_likes
      ) all_likes GROUP BY user_id
    ) likes ON u.id = likes.user_id
    WHERE (COALESCE(content.count, 0) * 5) + (COALESCE(msgs.count, 0) * 2) + COALESCE(likes.count, 0) > 0
    ORDER BY "totalPoints" DESC
  `);

  return contributorsResult.map((row) => ({
    id: row.id,
    name: row.name,
    avatarId: row.avatarId,
    contentCount: Number(row.contentCount),
    messagesCount: Number(row.messagesCount),
    likesCount: Number(row.likesCount),
    totalPoints: Number(row.totalPoints),
  }));
});
