import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import { and, asc, count, eq, gt, ilike, sql } from "drizzle-orm";

import { db } from "~/db";
import {
  biuSets,
  chatMessages,
  postLikes,
  postMessages,
  posts,
  riuSets,
  riuSubmissions,
  userFollows,
  userLocations,
  users,
  userSocials,
} from "~/db/schema";
import { PAGE_SIZE } from "~/lib/constants";
import { assertFound } from "~/lib/invariant";
import { authMiddleware } from "~/lib/middleware";
import { useServerSession } from "~/lib/session/hooks";
import {
  followUserSchema,
  getUserFollowsSchema,
  getUserSchema,
  listUsersSchema,
  unfollowUserSchema,
  updateUserSchema,
} from "~/lib/users/schemas";

export const allUsersServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  return await db
    .select({
      avatarId: users.avatarId,
      id: users.id,
      name: users.name,
    })
    .from(users)
    .orderBy(asc(users.id));
});

export const usersWithLocationsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  return await db
    .select({
      avatarId: users.avatarId,
      id: users.id,
      name: users.name,
      location: {
        lat: userLocations.lat,
        lng: userLocations.lng,
        label: userLocations.label,
        countryCode: userLocations.countryCode,
      },
    })
    .from(users)
    .innerJoin(userLocations, eq(userLocations.userId, users.id))
    .orderBy(asc(users.id));
});

export const listUsersServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listUsersSchema))
  .handler(async ({ data: input }) => {
    return await db
      .select({
        avatarId: users.avatarId,
        bio: users.bio,
        disciplines: users.disciplines,
        email: users.email,
        id: users.id,
        location: {
          countryCode: userLocations.countryCode,
          label: userLocations.label,
          lat: userLocations.lat,
          lng: userLocations.lng,
        },
        name: users.name,
        socials: {
          facebook: userSocials.facebook,
          instagram: userSocials.instagram,
          spotify: userSocials.spotify,
          tiktok: userSocials.tiktok,
          twitter: userSocials.twitter,
          youtube: userSocials.youtube,
        },
      })
      .from(users)
      .leftJoin(userLocations, eq(userLocations.userId, users.id))
      .leftJoin(userSocials, eq(userSocials.userId, users.id))
      .where(
        and(
          input.name ? ilike(users.name, `%${input.name}%`) : undefined,
          input.id ? eq(users.id, input.id) : undefined,
          input.disciplines && input.disciplines.length > 0
            ? sql`${users.disciplines}::jsonb @> ${sql.raw(`'${JSON.stringify(input.disciplines)}'`)}::jsonb`
            : undefined,
          input.cursor ? gt(users.id, input.cursor) : undefined,
        ),
      )
      .orderBy(asc(users.id))
      .limit(PAGE_SIZE);
  });

export const getUserServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserSchema))
  .handler(async ({ data }) => {
    return await getUser(data.userId);
  });

export const getUserWithFollowsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserSchema))
  .handler(async ({ data }) => {
    const [user, follows, stats] = await Promise.all([
      getUser(data.userId),
      getUserFollows(data.userId),
      getUserStats(data.userId),
    ]);

    return {
      ...user,
      ...follows,
      stats,
    };
  });

export const updateUserServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateUserSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { location, socials, ...updateData } = data;

    const userId = context.user.id;

    const session = await useServerSession();
    const promises: Promise<unknown>[] = [
      db.update(users).set(updateData).where(eq(users.id, userId)),
      session.update({ user: { ...context.user, ...updateData } }),
    ];

    if (location === null) {
      promises.push(
        db
          .delete(userLocations)
          .where(eq(userLocations.userId, userId))
          .returning(),
      );
    } else if (location !== undefined) {
      promises.push(
        db
          .insert(userLocations)
          .values({ ...location, userId })
          .onConflictDoUpdate({
            target: userLocations.userId,
            set: location,
          }),
      );
    }

    if (socials === null) {
      promises.push(
        db.delete(userSocials).where(eq(userSocials.userId, userId)),
      );
    } else if (socials !== undefined) {
      promises.push(
        db
          .insert(userSocials)
          .values({ ...socials, userId })
          .onConflictDoUpdate({ target: userSocials.userId, set: socials }),
      );
    }

    await Promise.all(promises);
  });

export const getUserFollowsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserFollowsSchema))
  .handler(async ({ data: input }) => {
    return await getUserFollows(input.userId);
  });

export const followUserServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(followUserSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    await db.insert(userFollows).values({
      followedByUserId: context.user.id,
      followedUserId: input.userId,
    });
  });

export const unfollowUserServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(unfollowUserSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followedByUserId, context.user.id),
          eq(userFollows.followedUserId, input.userId),
        ),
      );
  });

const getUser = createServerOnlyFn(async (userId: number) => {
  const [user] = await db
    .select({
      avatarId: users.avatarId,
      bio: users.bio,
      disciplines: users.disciplines,
      email: users.email,
      id: users.id,
      location: {
        countryName: userLocations.countryName,
        countryCode: userLocations.countryCode,
        label: userLocations.label,
        lat: userLocations.lat,
        lng: userLocations.lng,
      },
      name: users.name,
      socials: {
        facebook: userSocials.facebook,
        instagram: userSocials.instagram,
        spotify: userSocials.spotify,
        tiktok: userSocials.tiktok,
        twitter: userSocials.twitter,
        youtube: userSocials.youtube,
      },
    })
    .from(users)
    .where(eq(users.id, userId))
    .leftJoin(userLocations, eq(userLocations.userId, users.id))
    .leftJoin(userSocials, eq(userSocials.userId, users.id))
    .limit(1);

  assertFound(user);

  return user;
});

const getUserFollows = createServerOnlyFn(async (userId: number) => {
  const [followedUsersResult, followedByUsersResult] = await Promise.allSettled(
    [
      // Users that this user follows (followedByUserId = userId, join on followedUserId)
      db
        .select({
          avatarId: users.avatarId,
          id: users.id,
          name: users.name,
          location: {
            lat: userLocations.lat,
            lng: userLocations.lng,
          },
        })
        .from(userFollows)
        .innerJoin(users, eq(userFollows.followedUserId, users.id))
        .leftJoin(userLocations, eq(userLocations.userId, users.id))
        .where(eq(userFollows.followedByUserId, userId))
        .orderBy(asc(users.id)),
      // Users that follow this user (followedUserId = userId, join on followedByUserId)
      db
        .select({
          avatarId: users.avatarId,
          id: users.id,
          name: users.name,
          location: {
            lat: userLocations.lat,
            lng: userLocations.lng,
          },
        })
        .from(userFollows)
        .innerJoin(users, eq(userFollows.followedByUserId, users.id))
        .leftJoin(userLocations, eq(userLocations.userId, users.id))
        .where(eq(userFollows.followedUserId, userId))
        .orderBy(asc(users.id)),
    ],
  );

  const followedUsers =
    followedUsersResult.status === "fulfilled" ? followedUsersResult.value : [];
  const followedByUsers =
    followedByUsersResult.status === "fulfilled"
      ? followedByUsersResult.value
      : [];

  return {
    followers: {
      count: followedByUsers.length,
      users: followedByUsers,
    },
    following: {
      count: followedUsers.length,
      users: followedUsers,
    },
  };
});

const getUserStats = createServerOnlyFn(async (userId: number) => {
  const [
    postsResult,
    likesReceivedResult,
    commentsReceivedResult,
    submissionsResult,
    likesGivenResult,
    commentsMadeResult,
    activityByMonthResult,
    riuSetsResult,
    biuSetsResult,
    chatMessagesResult,
  ] = await Promise.all([
    // Count posts by this user
    db.select({ count: count() }).from(posts).where(eq(posts.userId, userId)),
    // Count likes received on this user's posts
    db
      .select({ count: count() })
      .from(postLikes)
      .innerJoin(posts, eq(postLikes.postId, posts.id))
      .where(eq(posts.userId, userId)),
    // Count comments received on this user's posts
    db
      .select({ count: count() })
      .from(postMessages)
      .innerJoin(posts, eq(postMessages.postId, posts.id))
      .where(eq(posts.userId, userId)),
    // Count RIU submissions by this user
    db
      .select({ count: count() })
      .from(riuSubmissions)
      .where(eq(riuSubmissions.userId, userId)),
    // Count likes given by this user
    db
      .select({ count: count() })
      .from(postLikes)
      .where(eq(postLikes.userId, userId)),
    // Count comments made by this user
    db
      .select({ count: count() })
      .from(postMessages)
      .where(eq(postMessages.userId, userId)),
    // Activity by month for this user
    db.execute<{ month: string; activityCount: number }>(sql`
      WITH monthly_activity AS (
        SELECT DATE_TRUNC('month', created_at) as month FROM posts WHERE user_id = ${userId}
        UNION ALL
        SELECT DATE_TRUNC('month', created_at) as month FROM post_messages WHERE user_id = ${userId}
        UNION ALL
        SELECT DATE_TRUNC('month', created_at) as month FROM riu_submissions WHERE user_id = ${userId}
        UNION ALL
        SELECT DATE_TRUNC('month', created_at) as month FROM riu_sets WHERE user_id = ${userId}
        UNION ALL
        SELECT DATE_TRUNC('month', created_at) as month FROM biu_sets WHERE user_id = ${userId}
        UNION ALL
        SELECT DATE_TRUNC('month', created_at) as month FROM chat_messages WHERE user_id = ${userId}
      )
      SELECT
        TO_CHAR(month, 'YYYY-MM') as month,
        COUNT(*) as "activityCount"
      FROM monthly_activity
      GROUP BY month
      ORDER BY month ASC
    `),
    // Count RIU sets created by this user
    db
      .select({ count: count() })
      .from(riuSets)
      .where(eq(riuSets.userId, userId)),
    // Count BIU sets created by this user
    db
      .select({ count: count() })
      .from(biuSets)
      .where(eq(biuSets.userId, userId)),
    // Count chat messages by this user
    db
      .select({ count: count() })
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId)),
  ]);

  return {
    posts: postsResult[0]?.count ?? 0,
    likesReceived: likesReceivedResult[0]?.count ?? 0,
    commentsReceived: commentsReceivedResult[0]?.count ?? 0,
    gameSubmissions: submissionsResult[0]?.count ?? 0,
    likesGiven: likesGivenResult[0]?.count ?? 0,
    commentsMade: commentsMadeResult[0]?.count ?? 0,
    activityByMonth: activityByMonthResult.map((row) => ({
      month: row.month,
      activityCount: Number(row.activityCount),
    })),
    gameSets: riuSetsResult[0]?.count ?? 0,
    biuSets: biuSetsResult[0]?.count ?? 0,
    chatMessages: chatMessagesResult[0]?.count ?? 0,
  };
});
