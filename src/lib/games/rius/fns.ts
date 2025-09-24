import { createServerFn } from "@tanstack/react-start";

import { and, eq } from "drizzle-orm";

import { db } from "~/db";
import {
  muxVideos,
  rius,
  riuSets,
  riuSubmissions,
  users,
  type UserDiscipline,
} from "~/db/schema";
import {
  createRiuSetSchema,
  createRiuSubmissionSchema,
  deleteRiuSetSchema,
  getRiuSetSchema,
  getRiuSubmissionSchema,
  updateRiuSetSchema,
} from "~/lib/games/rius/schemas";
import { invariant } from "~/lib/invariant";
import {
  adminOnlyMiddleware,
  authMiddleware,
  authOptionalMiddleware,
} from "~/lib/middleware";

export const getRiuSetServerFn = createServerFn({
  method: "GET",
})
  .validator(getRiuSetSchema)
  .handler(async ({ data: input }) => {
    const [set] = await db
      .select({
        instructions: riuSets.instructions,
        id: riuSets.id,
        name: riuSets.name,
        setPlaybackId: muxVideos.playbackId,
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
      .innerJoin(muxVideos, eq(riuSets.muxAssetId, muxVideos.assetId))
      .innerJoin(users, eq(riuSets.userId, users.id))
      .innerJoin(rius, eq(riuSets.riuId, rius.id))
      .where(eq(riuSets.id, input.setId));

    return set;
  });

export const createRiuSetServerFn = createServerFn({
  method: "POST",
})
  .validator(createRiuSetSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const upcomingRiu = await db.query.rius.findFirst({
      where: eq(rius.status, "upcoming"),
    });

    invariant(upcomingRiu, "No upcoming RIU found");

    const [riuSet] = await db
      .insert(riuSets)
      .values({
        ...input,

        riuId: upcomingRiu.id,
        userId,
      })
      .returning();

    return riuSet;
  });

export const updateRiuSetServerFn = createServerFn({
  method: "POST",
})
  .validator(updateRiuSetSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const [riuSet] = await db
      .update(riuSets)
      .set({ ...input })
      .where(
        and(
          eq(riuSets.id, input.riuSetId),
          eq(riuSets.userId, context.user.id),
        ),
      )
      .returning();

    return riuSet;
  });

export const deleteRiuSetServerFn = createServerFn({
  method: "POST",
})
  .validator(deleteRiuSetSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const set = await db.query.riuSets.findFirst({
      where: eq(riuSets.id, input.riuSetId),
    });

    invariant(set, "Set not found");

    invariant(set.userId === userId, "Access denied");

    const [deletedSet] = await db
      .delete(riuSets)
      .where(eq(riuSets.id, input.riuSetId))
      .returning();

    return deletedSet;
  });

export const getRiuSubmissionServerFn = createServerFn({
  method: "GET",
})
  .validator(getRiuSubmissionSchema)
  .handler(async ({ data: input }) => {
    const [submission] = await db
      .select({
        id: riuSubmissions.id,
        user: {
          avatarUrl: users.avatarUrl,
          id: users.id,
          name: users.name,
        },
        video: {
          playbackId: muxVideos.playbackId,
        },
      })
      .from(riuSubmissions)
      .innerJoin(muxVideos, eq(riuSubmissions.muxAssetId, muxVideos.assetId))
      .innerJoin(users, eq(riuSubmissions.userId, users.id))
      .where(eq(riuSubmissions.id, input.riuSubmissionId));

    return submission;
  });

export const createRiuSubmissionServerFn = createServerFn({
  method: "POST",
})
  .validator(createRiuSubmissionSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const [riuSet] = await db
      .select({
        id: riuSets.id,
        riu: {
          status: rius.status,
        },
      })
      .from(riuSets)
      .innerJoin(rius, eq(riuSets.riuId, rius.id))
      .where(eq(riuSets.id, input.riuSetId));

    if (!riuSet) {
      throw new Error("No RIU set found");
    }

    if (riuSet.riu.status !== "active") {
      throw new Error("RIU set is not from an active RIU");
    }

    const [riuSubmission] = await db
      .insert(riuSubmissions)
      .values({
        ...input,
        riuSetId: riuSet.id,
        userId,
      })
      .returning();

    return riuSubmission;
  });

export const listActiveRiusServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const activeRius = await db.query.rius.findFirst({
    where: eq(rius.status, "active"),
    with: {
      sets: {
        columns: {
          id: true,
          name: true,
        },
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          video: {
            columns: {
              playbackId: true,
            },
          },
        },
      },
    },
  });

  invariant(activeRius, "No active RIU found");

  return activeRius;
});

export const listArchivedRiusServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const archivedRius = await db.query.rius.findMany({
    where: eq(rius.status, "archived"),
    orderBy: (rius, { desc }) => [desc(rius.createdAt)],
    with: {
      sets: {
        columns: {
          id: true,
          name: true,
          instructions: true,
        },
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          video: {
            columns: {
              playbackId: true,
            },
          },
        },
      },
    },
  });

  return archivedRius;
});

export const listUpcomingRiuRosterServerFn = createServerFn({
  method: "GET",
})
  .middleware([authOptionalMiddleware])
  .handler(async ({ context }) => {
    const sets = await db
      .select({
        instructions: riuSets.instructions,
        id: riuSets.id,
        name: riuSets.name,
        user: {
          avatarUrl: users.avatarUrl,
          id: users.id,
          name: users.name,
          bio: users.bio,
          disciplines: users.disciplines,
          createdAt: users.createdAt,
        },
        video: {
          playbackId: muxVideos.playbackId,
        },
      })
      .from(riuSets)
      .innerJoin(rius, eq(rius.id, riuSets.riuId))
      .innerJoin(users, eq(riuSets.userId, users.id))
      .innerJoin(muxVideos, eq(riuSets.muxAssetId, muxVideos.assetId))
      .where(eq(rius.status, "upcoming"));

    const map = new Map<
      number,
      {
        avatarUrl: null | string;
        count: number;
        id: number;
        name: string;
        bio: string | null;
        disciplines: UserDiscipline[] | null;
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

    const isAuthUsersSet = (set: (typeof sets)[number]) => {
      return context.user && set.user.id === context.user.id;
    };

    return {
      authUserSets: context.user ? sets.filter(isAuthUsersSet) : undefined,
      roster: Object.fromEntries(map),
    };
  });

export const adminOnlyRotateRiusServerFn = createServerFn({
  method: "POST",
})
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    await db
      .update(rius)
      .set({ status: "archived" })
      .where(eq(rius.status, "active"));

    console.log("moved active rius to archived");

    await db
      .update(rius)
      .set({ status: "active" })
      .where(eq(rius.status, "upcoming"));

    console.log("moved upcoming riu to active");

    await db.insert(rius).values({
      status: "upcoming",
    });

    console.log("created new upcoming riu");
  });
