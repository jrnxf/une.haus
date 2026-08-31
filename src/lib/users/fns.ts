import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import {
  adminOnlyMiddleware,
  authMiddleware,
  authOptionalMiddleware,
} from "~/lib/middleware"
import { useServerSession } from "~/lib/session/hooks"
import {
  followUserSchema,
  getUserActivitySchema,
  getUserFollowsSchema,
  getUserSchema,
  getUserVideosSchema,
  listUsersSchema,
  type USER_VIDEO_TYPES,
  setShopNotifySchema,
  unfollowUserSchema,
  updateUserSchema,
} from "~/lib/users/schemas"

const loadUserOps = createServerOnlyFn(() => import("~/lib/users/ops.server"))

export const allUsersServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { allUsers } = await loadUserOps()
  return allUsers()
})

export const usersWithLocationsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { usersWithLocations } = await loadUserOps()
  return usersWithLocations()
})

export const listUsersServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listUsersSchema))
  .handler(async (ctx) => {
    const { listUsers } = await loadUserOps()
    return listUsers(ctx)
  })

export const getUserWithFollowsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserSchema))
  .handler(async ({ data }) => {
    const { getUser, getUserFollows, getUserStats, getUserVideosCount } =
      await loadUserOps()
    const [user, follows, stats, videosCount] = await Promise.all([
      getUser(data.userId),
      getUserFollows(data.userId),
      getUserStats(data.userId),
      getUserVideosCount(data.userId),
    ])

    return {
      ...user,
      ...follows,
      stats,
      videosCount,
    }
  })

export const updateUserServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateUserSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const session = await useServerSession()
    const { updateUser } = await loadUserOps()

    await updateUser({
      context,
      data,
      updateSession: (payload) => session.update(payload),
    })
  })

export const getUserFollowsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserFollowsSchema))
  .handler(async ({ data: input }) => {
    const { getUserFollows } = await loadUserOps()
    return getUserFollows(input.userId)
  })

export const followUserServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(followUserSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { followUser } = await loadUserOps()
    return followUser(ctx)
  })

export const unfollowUserServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(unfollowUserSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { unfollowUser } = await loadUserOps()
    return unfollowUser(ctx)
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
  trickName?: string | null
  // UTV Video fields
  videoId?: number | null
  videoTitle?: string | null
}

export const getUserActivityServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserActivitySchema))
  .handler(async (ctx) => {
    const { getUserActivity } = await loadUserOps()
    return getUserActivity(ctx)
  })

export type UserVideoType = (typeof USER_VIDEO_TYPES)[number]

export type UserVideoItem = {
  type: UserVideoType
  id: number
  createdAt: Date
  playbackId: string
  /** Post title, set name, or trick name — whatever names the source entity */
  title: string | null
  /** Only set for trickVideo items, which link to the trick page */
  trickId?: number
}

export const getUserVideosServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserVideosSchema))
  .handler(async (ctx) => {
    const { getUserVideos } = await loadUserOps()
    return getUserVideos(ctx)
  })

export const setShopNotifyServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(setShopNotifySchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { setShopNotify } = await loadUserOps()
    return setShopNotify(ctx)
  })

export const getShopWaitlistCountServerFn = createServerFn({
  method: "GET",
})
  .middleware([authOptionalMiddleware])
  .handler(async (ctx) => {
    const { getShopWaitlistCount } = await loadUserOps()
    return getShopWaitlistCount(ctx)
  })

export const getShopWaitlistUsersServerFn = createServerFn({
  method: "GET",
})
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    const { getShopWaitlistUsers } = await loadUserOps()
    return getShopWaitlistUsers()
  })
