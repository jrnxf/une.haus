import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { authMiddleware, authOptionalMiddleware } from "~/lib/middleware"
import { useServerSession } from "~/lib/session/hooks"
import {
  followUserSchema,
  getUserActivitySchema,
  getUserFollowsSchema,
  getUserSchema,
  listUsersSchema,
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

export const getUserServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserSchema))
  .handler(async ({ data }) => {
    const { getUser } = await loadUserOps()
    return getUser(data.userId)
  })

export const getUserWithFollowsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUserSchema))
  .handler(async ({ data }) => {
    const { getUser, getUserFollows } = await loadUserOps()
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
  .handler(async (ctx) => {
    const { getUserActivity } = await loadUserOps()
    return getUserActivity(ctx)
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
