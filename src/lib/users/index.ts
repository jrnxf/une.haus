import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  allUsersServerFn,
  followUserServerFn,
  getUserFollowsServerFn,
  getUserServerFn,
  listUsersServerFn,
  unfollowUserServerFn,
  updateUserServerFn,
} from "~/lib/users/fns";
import {
  followUserSchema,
  getUserFollowsSchema,
  getUserSchema,
  listUsersSchema,
  unfollowUserSchema,
  updateUserSchema,
} from "~/lib/users/schemas";
import { type ServerFnReturn, type ServerFnData } from "~/lib/types";

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
          if (lastPage.length < 25) {
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
    fn: getUserServerFn,
    schema: getUserSchema,
    queryOptions: (data: ServerFnData<typeof getUserServerFn>) => {
      return queryOptions({
        queryKey: ["users.get", data],
        queryFn: () => getUserServerFn({ data }),
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
export type UsersUpdateData = ServerFnReturn<typeof updateUserServerFn>;
