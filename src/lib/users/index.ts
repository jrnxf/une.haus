import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { PAGE_SIZE } from "~/lib/constants";
import { type ServerFnData, type ServerFnReturn } from "~/lib/types";
import {
  allUsersServerFn,
  followUserServerFn,
  getUserFollowsServerFn,
  getUserWithFollowsServerFn,
  listUsersServerFn,
  unfollowUserServerFn,
  updateUserServerFn,
  usersWithLocationsServerFn,
  type getUserServerFn,
} from "~/lib/users/fns";
import {
  followUserSchema,
  getUserFollowsSchema,
  getUserSchema,
  listUsersSchema,
  unfollowUserSchema,
  updateUserSchema,
} from "~/lib/users/schemas";

export const users = {
  all: {
    fn: allUsersServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["users.all"],
        queryFn: allUsersServerFn,
      });
    },
  },
  withLocations: {
    fn: usersWithLocationsServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["users.withLocations"],
        queryFn: usersWithLocationsServerFn,
      });
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
          });
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
          if (lastPage.length < PAGE_SIZE) {
            // the last page returned less than the requested limit, so we
            // know there is no more results for this filter set
            return;
          }
          return lastPage.at(-1)?.id;
        },
      });
    },
  },
  get: {
    fn: getUserWithFollowsServerFn,
    schema: getUserSchema,
    queryOptions: (data: ServerFnData<typeof getUserWithFollowsServerFn>) => {
      return queryOptions({
        queryKey: ["users.get", data],
        queryFn: () => getUserWithFollowsServerFn({ data }),
      });
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
      });
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
};

export type UsersGetData = ServerFnReturn<typeof getUserServerFn>;
export type UsersWithFollowsData = ServerFnReturn<
  typeof getUserWithFollowsServerFn
>;
export type UsersFollowsData = ServerFnReturn<typeof getUserFollowsServerFn>;
export type UsersUpdateData = ServerFnReturn<typeof updateUserServerFn>;
export type UsersWithLocationsData = ServerFnReturn<
  typeof usersWithLocationsServerFn
>;
