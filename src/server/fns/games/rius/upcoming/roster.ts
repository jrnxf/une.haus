import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "~/db";
import { muxVideos, rius, riuSets, users } from "~/db/schema";
import { authOptionalMiddleware } from "~/server/middleware/auth";

const serverFn = createServerFn({
  method: "GET",
})
  .middleware([authOptionalMiddleware])
  .handler(async ({ context }) => {
    const sets = await db
      .select({
        description: riuSets.description,
        id: riuSets.id,
        name: riuSets.name,
        user: {
          avatarUrl: users.avatarUrl,
          id: users.id,
          name: users.name,
        },
        video: {
          playbackId: muxVideos.playbackId,
        },
      })
      .from(riuSets)
      .innerJoin(rius, eq(rius.id, riuSets.riuId))
      .innerJoin(users, eq(riuSets.userId, users.id))
      .innerJoin(muxVideos, eq(riuSets.videoUploadId, muxVideos.uploadId))
      .where(eq(rius.status, "upcoming"));

    const map = new Map<
      number,
      {
        avatarUrl: null | string;
        count: number;
        id: number;
        name: string;
      }
    >();

    for (const set of sets) {
      if (set.user) {
        const existing = map.get(set.user.id);
        if (existing) {
          existing.count++;
        } else {
          map.set(set.user.id, {
            ...set.user,
            count: 1,
          });
        }
      }
    }

    return {
      authUserSets: context.user
        ? sets.filter(
            (set) =>
              set.user && context.user && set.user.id === context.user.id,
          )
        : undefined,
      roster: Object.fromEntries(map),
    };
  });

export const getUpcomingRiuRoster = {
  queryOptions: () =>
    queryOptions({
      queryKey: ["games", "rius", "upcoming", "roster"],
      queryFn: serverFn,
      refetchInterval: 5000,
    }),
  serverFn,
};
