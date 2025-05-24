import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { invariant } from "~/lib/invariant";
import { z } from "zod";

import { db } from "~/db";
import { userFollows, userLocations, users, userSocials } from "~/db/schema";
import { USER_FOLLOWS_KEY } from "~/lib/keys";
import { type ServerFnData } from "~/server/types";

export const schema = z.object({
  userId: z.coerce.number(),
});

export const serverFn = createServerFn({
  method: "GET",
})
  .validator(schema)
  .handler(async ({ data }) => {
    const [followedUsersResult, followedByUsersResult] =
      await Promise.allSettled([
        db
          .select({
            avatarUrl: users.avatarUrl,
            id: users.id,
            name: users.name,
          })
          .from(userFollows)
          .leftJoin(users, eq(userFollows.followedUserId, users.id))
          .where(eq(userFollows.followedByUserId, data.userId))
          .orderBy(asc(users.id)),

        db
          .select({
            avatarUrl: users.avatarUrl,
            id: users.id,
            name: users.name,
          })
          .from(userFollows)
          .leftJoin(users, eq(userFollows.followedByUserId, users.id))
          .where(eq(userFollows.followedUserId, data.userId))
          .orderBy(asc(users.id)),
      ]);

    const followedUsers =
      followedUsersResult.status === "fulfilled"
        ? followedUsersResult.value
        : [];
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

export const getFollows = {
  queryOptions: (data: ServerFnData<typeof serverFn>) => {
    return queryOptions({
      queryKey: [USER_FOLLOWS_KEY(data.userId)],
      queryFn: () => serverFn({ data }),
    });
  },
  schema,
  serverFn,
};
