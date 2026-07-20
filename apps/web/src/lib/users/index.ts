import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { PAGE_SIZE } from "~/lib/constants"
import { type ServerFnData, type ServerFnReturn } from "~/lib/types"
import {
  allUsersServerFn,
  followUserServerFn,
  getShopWaitlistCountServerFn,
  getShopWaitlistUsersServerFn,
  getUserActivityServerFn,
  getUserFollowsServerFn,
  getUserVideosServerFn,
  getUserWithFollowsServerFn,
  listUsersServerFn,
  setShopNotifyServerFn,
  unfollowUserServerFn,
  updateUserServerFn,
  usersWithLocationsServerFn,
} from "~/lib/users/fns"
import {
  followUserSchema,
  getUserActivitySchema,
  getUserFollowsSchema,
  getUserSchema,
  getUserVideosSchema,
  listUsersSchema,
  setShopNotifySchema,
  unfollowUserSchema,
  updateUserSchema,
} from "~/lib/users/schemas"

export const users = {
  all: {
    fn: allUsersServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["users.all"],
        queryFn: allUsersServerFn,
      })
    },
  },
  withLocations: {
    fn: usersWithLocationsServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["users.withLocations"],
        queryFn: usersWithLocationsServerFn,
      })
    },
  },
  list: {
    fn: listUsersServerFn,
    schema: listUsersSchema,
    infiniteQueryOptions: (data: ServerFnData<typeof listUsersServerFn>) => {
      return infiniteQueryOptions({
        queryKey: ["users.list", data],
        queryFn: ({ pageParam: cursor }) => {
          return listUsersServerFn({
            data: {
              ...data,
              cursor,
            },
          })
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
          if (lastPage.length < PAGE_SIZE) {
            // the last page returned less than the requested limit, so we
            // know there is no more results for this filter set
            return
          }
          return lastPage.at(-1)?.id
        },
      })
    },
  },
  get: {
    fn: getUserWithFollowsServerFn,
    schema: getUserSchema,
    queryOptions: (data: ServerFnData<typeof getUserWithFollowsServerFn>) => {
      return queryOptions({
        queryKey: ["users.get", data],
        queryFn: () => getUserWithFollowsServerFn({ data }),
      })
    },
  },
  update: {
    fn: updateUserServerFn,
    schema: updateUserSchema,
  },
  follows: {
    fn: getUserFollowsServerFn,
    schema: getUserFollowsSchema,
    queryOptions: (data: ServerFnData<typeof getUserFollowsServerFn>) => {
      return queryOptions({
        queryKey: ["users.follows", data],
        queryFn: () => getUserFollowsServerFn({ data }),
      })
    },
  },
  follow: {
    fn: followUserServerFn,
    schema: followUserSchema,
  },
  unfollow: {
    fn: unfollowUserServerFn,
    schema: unfollowUserSchema,
  },
  activity: {
    fn: getUserActivityServerFn,
    schema: getUserActivitySchema,
    infiniteQueryOptions: (
      data: Omit<
        ServerFnData<typeof getUserActivityServerFn>,
        "cursor" | "limit"
      >,
    ) => {
      return infiniteQueryOptions({
        queryKey: ["users.activity", data],
        queryFn: ({ pageParam: cursor }) => {
          return getUserActivityServerFn({
            data: {
              ...data,
              cursor,
            },
          })
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      })
    },
  },
  /** First few activity items for the profile page preview section */
  activityPreview: {
    queryOptions: (data: { userId: number }) => {
      return queryOptions({
        queryKey: ["users.activity.preview", data],
        queryFn: () => getUserActivityServerFn({ data: { ...data, limit: 5 } }),
      })
    },
  },
  /** First few videos for the profile page preview strip */
  videosPreview: {
    queryOptions: (data: { userId: number }) => {
      return queryOptions({
        queryKey: ["users.videos.preview", data],
        queryFn: () => getUserVideosServerFn({ data: { ...data, limit: 4 } }),
      })
    },
  },
  videos: {
    fn: getUserVideosServerFn,
    schema: getUserVideosSchema,
    infiniteQueryOptions: (
      data: Omit<
        ServerFnData<typeof getUserVideosServerFn>,
        "cursor" | "limit"
      >,
    ) => {
      return infiniteQueryOptions({
        queryKey: ["users.videos", data],
        queryFn: ({ pageParam: cursor }) => {
          return getUserVideosServerFn({
            data: {
              ...data,
              cursor,
            },
          })
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      })
    },
  },
  setShopNotify: {
    fn: setShopNotifyServerFn,
    schema: setShopNotifySchema,
  },
  shopWaitlistCount: {
    fn: getShopWaitlistCountServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["users.shopWaitlistCount"],
        queryFn: getShopWaitlistCountServerFn,
      })
    },
  },
  shopWaitlistUsers: {
    fn: getShopWaitlistUsersServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["users.shopWaitlistUsers"],
        queryFn: getShopWaitlistUsersServerFn,
      })
    },
  },
}

export type UsersWithFollowsData = ServerFnReturn<
  typeof getUserWithFollowsServerFn
>
export type UsersWithLocationsData = ServerFnReturn<
  typeof usersWithLocationsServerFn
>

export type { ActivityItem, UserVideoItem } from "~/lib/users/fns"
