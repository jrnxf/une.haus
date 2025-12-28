import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import { and, asc, eq, gt, ilike, sql } from "drizzle-orm";

import { db } from "~/db";
import { userFollows, userLocations, users, userSocials } from "~/db/schema";
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
    const [user, follows] = await Promise.all([
      getUser(data.userId),
      getUserFollows(data.userId),
    ]);

    return {
      ...user,
      ...follows,
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
