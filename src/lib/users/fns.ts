import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, asc, desc, eq, gt, ilike, isNull, lt, sql } from "drizzle-orm"

import { db } from "~/db"
import {
  biuSets,
  postMessages,
  posts,
  riuSets,
  riuSubmissions,
  siuSets,
  trickSubmissions,
  trickSuggestions,
  trickVideos,
  tricks,
  userFollows,
  userLocations,
  userSocials,
  users,
  utvVideoSuggestions,
  utvVideos,
} from "~/db/schema"
import { PAGE_SIZE } from "~/lib/constants"
import { assertFound } from "~/lib/invariant"
import { authMiddleware, authOptionalMiddleware } from "~/lib/middleware"
import { createNotification } from "~/lib/notifications/helpers"
import { useServerSession } from "~/lib/session/hooks"
import {
  followUserSchema,
  getUserActivitySchema,
  getUserFollowsSchema,
  getUserSchema,
  listUsersSchema,
  setShopNotifySchema,
  unfollowUserSchema,
  type UpdateUserArgs,
  updateUserSchema,
} from "~/lib/users/schemas"

const getTime = (d: Date) => d.getTime()

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

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
    .orderBy(asc(users.id))
})

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
    .orderBy(asc(users.id))
})

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
      .limit(PAGE_SIZE)
  })

export const getUserServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserSchema))
  .handler(async ({ data }) => {
    return await getUser(data.userId)
  })

export const getUserWithFollowsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserSchema))
  .handler(async ({ data }) => {
    const [user, follows] = await Promise.all([
      getUser(data.userId),
      getUserFollows(data.userId),
    ])

    return {
      ...user,
      ...follows,
    }
  })

export const updateUserServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateUserSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const session = await useServerSession()

    await updateUserImpl({
      context,
      data,
      updateSession: (payload) => session.update(payload),
    })
  })

export async function updateUserImpl({
  data,
  context,
  updateSession,
}: {
  context: AuthenticatedContext
  data: UpdateUserArgs
  updateSession: (payload: {
    user: {
      avatarId: string | null
      email: string
      id: number
      name: string
    }
  }) => Promise<unknown>
}) {
  const { location, socials, ...updateData } = data

  const userId = context.user.id

  const promises: Promise<unknown>[] = [
    db.update(users).set(updateData).where(eq(users.id, userId)),
    updateSession({
      user: {
        avatarId: updateData.avatarId,
        email: updateData.email,
        id: context.user.id,
        name: updateData.name,
      },
    }),
  ]

  if (location === null) {
    promises.push(
      db
        .delete(userLocations)
        .where(eq(userLocations.userId, userId))
        .returning(),
    )
  } else if (location !== undefined) {
    promises.push(
      db
        .insert(userLocations)
        .values({ ...location, userId })
        .onConflictDoUpdate({
          target: userLocations.userId,
          set: location,
        }),
    )
  }

  if (socials === null) {
    promises.push(db.delete(userSocials).where(eq(userSocials.userId, userId)))
  } else if (socials !== undefined) {
    promises.push(
      db
        .insert(userSocials)
        .values({ ...socials, userId })
        .onConflictDoUpdate({ target: userSocials.userId, set: socials }),
    )
  }

  await Promise.all(promises)
}

export const getUserFollowsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserFollowsSchema))
  .handler(async ({ data: input }) => {
    return await getUserFollows(input.userId)
  })

export const followUserServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(followUserSchema))
  .middleware([authMiddleware])
  .handler(followUserImpl)

export async function followUserImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    userId: number
  }
}) {
  await db.insert(userFollows).values({
    followedByUserId: context.user.id,
    followedUserId: input.userId,
  })

  // Notify the followed user
  createNotification({
    userId: input.userId,
    actorId: context.user.id,
    type: "follow",
    entityType: "user",
    entityId: context.user.id, // The actor is the entity (link to their profile)
    data: {
      actorName: context.user.name,
      actorAvatarId: context.user.avatarId,
    },
  }).catch(console.error)
}

export const unfollowUserServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(unfollowUserSchema))
  .middleware([authMiddleware])
  .handler(unfollowUserImpl)

export async function unfollowUserImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    userId: number
  }
}) {
  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followedByUserId, context.user.id),
        eq(userFollows.followedUserId, input.userId),
      ),
    )
}

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
    .limit(1)

  assertFound(user)

  return user
})

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
  )

  const followedUsers =
    followedUsersResult.status === "fulfilled" ? followedUsersResult.value : []
  const followedByUsers =
    followedByUsersResult.status === "fulfilled"
      ? followedByUsersResult.value
      : []

  return {
    followers: {
      count: followedByUsers.length,
      users: followedByUsers,
    },
    following: {
      count: followedUsers.length,
      users: followedUsers,
    },
  }
})

export type ActivityType =
  | "post"
  | "comment"
  | "riuSet"
  | "riuSubmission"
  | "biuSet"
  | "trickSubmission"
  | "trickSuggestion"
  | "trickVideo"
  | "utvVideo"
  | "utvVideoSuggestion"
  | "siuSet"

export type ActivityItem = {
  type: ActivityType
  id: number
  createdAt: Date
  // Post fields
  title?: string | null
  content?: string | null
  imageId?: string | null
  // Comment fields
  parentType?: "post" | "riuSet" | "riuSubmission" | "biuSet"
  parentId?: number | null
  parentTitle?: string | null
  // Game fields
  name?: string | null
  riuId?: number | null
  riuSetId?: number | null
  biuId?: number | null
  siuId?: number | null
  muxAssetId?: string | null
  // Trick fields
  trickId?: number | null
  trickSlug?: string | null
  trickName?: string | null
  // UTV Video fields
  videoId?: number | null
  videoTitle?: string | null
}

export const getUserActivityServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserActivitySchema))
  .handler(getUserActivityImpl)

export async function getUserActivityImpl({
  data,
}: {
  data: {
    cursor?: string | null
    limit?: number
    type?: ActivityType
    userId: number
  }
}) {
  const { userId, cursor, limit = 50, type: typeFilter } = data

  // Parse cursor timestamp for pagination
  // Cursor format: "timestamp|type|id" (using | since ISO timestamps contain colons)
  let cursorDate: Date | null = null
  if (cursor) {
    const [timestamp] = cursor.split("|")
    cursorDate = new Date(timestamp)
  }

  // Helper to check if we should fetch a specific type
  const shouldFetch = (type: string) => !typeFilter || typeFilter === type

  // Fetch activity from each source in parallel using drizzle query builder
  // When a type filter is set, only fetch that specific source
  const [
    postsData,
    commentsData,
    riuSetsData,
    riuSubsData,
    biuSetsData,
    trickSubmissionsData,
    trickSuggestionsData,
    trickVideosData,
    utvVideoSuggestionsData,
    siuSetsData,
  ] = await Promise.all([
    // Posts
    shouldFetch("post")
      ? db
          .select({
            id: posts.id,
            createdAt: posts.createdAt,
            title: posts.title,
            content: posts.content,
          })
          .from(posts)
          .where(
            cursorDate
              ? and(eq(posts.userId, userId), lt(posts.createdAt, cursorDate))
              : eq(posts.userId, userId),
          )
          .orderBy(desc(posts.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),

    // Post comments with parent info
    shouldFetch("comment")
      ? db
          .select({
            id: postMessages.id,
            createdAt: postMessages.createdAt,
            content: postMessages.content,
            parentId: postMessages.postId,
            parentTitle: posts.title,
          })
          .from(postMessages)
          .innerJoin(posts, eq(postMessages.postId, posts.id))
          .where(
            cursorDate
              ? and(
                  eq(postMessages.userId, userId),
                  lt(postMessages.createdAt, cursorDate),
                )
              : eq(postMessages.userId, userId),
          )
          .orderBy(desc(postMessages.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),

    // RIU Sets
    shouldFetch("riuSet")
      ? db
          .select({
            id: riuSets.id,
            createdAt: riuSets.createdAt,
            name: riuSets.name,
            content: riuSets.instructions,
            riuId: riuSets.riuId,
          })
          .from(riuSets)
          .where(
            cursorDate
              ? and(
                  eq(riuSets.userId, userId),
                  lt(riuSets.createdAt, cursorDate),
                )
              : eq(riuSets.userId, userId),
          )
          .orderBy(desc(riuSets.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),

    // RIU Submissions with set name
    shouldFetch("riuSubmission")
      ? db
          .select({
            id: riuSubmissions.id,
            createdAt: riuSubmissions.createdAt,
            riuSetId: riuSubmissions.riuSetId,
            parentTitle: riuSets.name,
            content: riuSets.instructions,
          })
          .from(riuSubmissions)
          .innerJoin(riuSets, eq(riuSubmissions.riuSetId, riuSets.id))
          .where(
            cursorDate
              ? and(
                  eq(riuSubmissions.userId, userId),
                  lt(riuSubmissions.createdAt, cursorDate),
                )
              : eq(riuSubmissions.userId, userId),
          )
          .orderBy(desc(riuSubmissions.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),

    // BIU Sets
    shouldFetch("biuSet")
      ? db
          .select({
            id: biuSets.id,
            createdAt: biuSets.createdAt,
            biuId: biuSets.biuId,
            name: biuSets.name,
          })
          .from(biuSets)
          .where(
            and(
              eq(biuSets.userId, userId),
              isNull(biuSets.deletedAt),
              cursorDate ? lt(biuSets.createdAt, cursorDate) : undefined,
            ),
          )
          .orderBy(desc(biuSets.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),

    // Trick Submissions
    shouldFetch("trickSubmission")
      ? db
          .select({
            id: trickSubmissions.id,
            createdAt: trickSubmissions.createdAt,
            name: trickSubmissions.name,
          })
          .from(trickSubmissions)
          .where(
            cursorDate
              ? and(
                  eq(trickSubmissions.submittedByUserId, userId),
                  lt(trickSubmissions.createdAt, cursorDate),
                )
              : eq(trickSubmissions.submittedByUserId, userId),
          )
          .orderBy(desc(trickSubmissions.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),

    // Trick Suggestions with trick info
    shouldFetch("trickSuggestion")
      ? db
          .select({
            id: trickSuggestions.id,
            createdAt: trickSuggestions.createdAt,
            trickId: trickSuggestions.trickId,
            trickSlug: tricks.slug,
            trickName: tricks.name,
          })
          .from(trickSuggestions)
          .innerJoin(tricks, eq(trickSuggestions.trickId, tricks.id))
          .where(
            cursorDate
              ? and(
                  eq(trickSuggestions.submittedByUserId, userId),
                  lt(trickSuggestions.createdAt, cursorDate),
                )
              : eq(trickSuggestions.submittedByUserId, userId),
          )
          .orderBy(desc(trickSuggestions.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),

    // Trick Videos with trick info
    shouldFetch("trickVideo")
      ? db
          .select({
            id: trickVideos.id,
            createdAt: trickVideos.createdAt,
            trickId: trickVideos.trickId,
            trickSlug: tricks.slug,
            trickName: tricks.name,
          })
          .from(trickVideos)
          .innerJoin(tricks, eq(trickVideos.trickId, tricks.id))
          .where(
            cursorDate
              ? and(
                  eq(trickVideos.submittedByUserId, userId),
                  lt(trickVideos.createdAt, cursorDate),
                )
              : eq(trickVideos.submittedByUserId, userId),
          )
          .orderBy(desc(trickVideos.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),

    // UTV Video Suggestions
    shouldFetch("utvVideoSuggestion")
      ? db
          .select({
            id: utvVideoSuggestions.id,
            createdAt: utvVideoSuggestions.createdAt,
            videoId: utvVideoSuggestions.utvVideoId,
            videoTitle: utvVideos.title,
          })
          .from(utvVideoSuggestions)
          .innerJoin(
            utvVideos,
            eq(utvVideoSuggestions.utvVideoId, utvVideos.id),
          )
          .where(
            cursorDate
              ? and(
                  eq(utvVideoSuggestions.submittedByUserId, userId),
                  lt(utvVideoSuggestions.createdAt, cursorDate),
                )
              : eq(utvVideoSuggestions.submittedByUserId, userId),
          )
          .orderBy(desc(utvVideoSuggestions.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),

    // SIU Sets
    shouldFetch("siuSet")
      ? db
          .select({
            id: siuSets.id,
            createdAt: siuSets.createdAt,
            siuId: siuSets.siuId,
            name: siuSets.name,
          })
          .from(siuSets)
          .where(
            and(
              eq(siuSets.userId, userId),
              isNull(siuSets.deletedAt),
              cursorDate ? lt(siuSets.createdAt, cursorDate) : undefined,
            ),
          )
          .orderBy(desc(siuSets.createdAt))
          .limit(limit + 1)
      : Promise.resolve([]),
  ])

  // Combine all items with timestamp for sorting
  const allItems: (ActivityItem & { _ts: number })[] = [
    ...postsData.map((row) => ({
      type: "post" as const,
      id: row.id,
      createdAt: row.createdAt,
      title: row.title,
      content: row.content,
      _ts: getTime(row.createdAt),
    })),
    ...commentsData.map((row) => ({
      type: "comment" as const,
      id: row.id,
      createdAt: row.createdAt,
      content: row.content,
      parentType: "post" as const,
      parentId: row.parentId,
      parentTitle: row.parentTitle,
      _ts: getTime(row.createdAt),
    })),
    ...riuSetsData.map((row) => ({
      type: "riuSet" as const,
      id: row.id,
      createdAt: row.createdAt,
      name: row.name,
      content: row.content,
      riuId: row.riuId,
      _ts: getTime(row.createdAt),
    })),
    ...riuSubsData.map((row) => ({
      type: "riuSubmission" as const,
      id: row.id,
      createdAt: row.createdAt,
      riuSetId: row.riuSetId,
      parentTitle: row.parentTitle,
      content: row.content,
      _ts: getTime(row.createdAt),
    })),
    ...biuSetsData.map((row) => ({
      type: "biuSet" as const,
      id: row.id,
      createdAt: row.createdAt,
      biuId: row.biuId,
      name: row.name,
      _ts: getTime(row.createdAt),
    })),
    ...trickSubmissionsData.map((row) => ({
      type: "trickSubmission" as const,
      id: row.id,
      createdAt: row.createdAt,
      name: row.name,
      _ts: getTime(row.createdAt),
    })),
    ...trickSuggestionsData.map((row) => ({
      type: "trickSuggestion" as const,
      id: row.id,
      createdAt: row.createdAt,
      trickId: row.trickId,
      trickSlug: row.trickSlug,
      trickName: row.trickName,
      _ts: getTime(row.createdAt),
    })),
    ...trickVideosData.map((row) => ({
      type: "trickVideo" as const,
      id: row.id,
      createdAt: row.createdAt,
      trickId: row.trickId,
      trickSlug: row.trickSlug,
      trickName: row.trickName,
      _ts: getTime(row.createdAt),
    })),
    ...utvVideoSuggestionsData.map((row) => ({
      type: "utvVideoSuggestion" as const,
      id: row.id,
      createdAt: row.createdAt,
      videoId: row.videoId,
      videoTitle: row.videoTitle,
      _ts: getTime(row.createdAt),
    })),
    ...siuSetsData.map((row) => ({
      type: "siuSet" as const,
      id: row.id,
      createdAt: row.createdAt,
      siuId: row.siuId,
      name: row.name,
      _ts: getTime(row.createdAt),
    })),
  ]

  // Sort by timestamp descending (newest first)
  allItems.sort((a, b) => b._ts - a._ts)

  // Remove the _ts field before returning
  const sortedItems = allItems.map(({ _ts, ...item }) => item)

  const hasMore = sortedItems.length > limit
  const items = sortedItems.slice(0, limit)

  // Create cursor for next page (using | separator since ISO timestamps contain colons)
  let nextCursor: string | undefined
  if (hasMore && items.length > 0) {
    const lastItem = items.at(-1)
    if (lastItem) {
      nextCursor = `${new Date(lastItem.createdAt).toISOString()}|${lastItem.type}|${lastItem.id}`
    }
  }

  return { items, nextCursor }
}

export const setShopNotifyServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(setShopNotifySchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .update(users)
      .set({ notifyWhenShop: data.notify })
      .where(eq(users.id, context.user.id))
  })

export const getShopWaitlistCountServerFn = createServerFn({
  method: "GET",
})
  .middleware([authOptionalMiddleware])
  .handler(async ({ context }) => {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.notifyWhenShop, true))

    let isOnWaitlist = false
    if (context.user) {
      const [row] = await db
        .select({ notifyWhenShop: users.notifyWhenShop })
        .from(users)
        .where(eq(users.id, context.user.id))
      isOnWaitlist = row?.notifyWhenShop ?? false
    }

    return { count: result.count, isOnWaitlist }
  })
