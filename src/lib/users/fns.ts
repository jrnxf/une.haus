import { createServerFn } from "@tanstack/react-start";

import { and, asc, eq, gt, ilike, sql } from "drizzle-orm";

import { db } from "~/db";
import { userFollows, userLocations, users, userSocials } from "~/db/schema";
import { PAGE_SIZE } from "~/lib/constants";
import { assertFound } from "~/lib/invariant";
import { authMiddleware } from "~/lib/middleware";
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
      avatarUrl: users.avatarUrl,
      id: users.id,
      name: users.name,
    })
    .from(users)
    .orderBy(asc(users.id));
});

export const listUsersServerFn = createServerFn({
  method: "GET",
})
  .validator(listUsersSchema)
  .handler(async ({ data: input }) => {
    return await db
      .select({
        avatarUrl: users.avatarUrl,
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
          input.q ? ilike(users.name, `%${input.q}%`) : undefined,
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
  .validator(getUserSchema)
  .handler(async ({ data }) => {
    const [user] = await db
      .select({
        avatarUrl: users.avatarUrl,
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
      .where(eq(users.id, data.userId))
      .leftJoin(userLocations, eq(userLocations.userId, users.id))
      .leftJoin(userSocials, eq(userSocials.userId, users.id))
      // .leftJoin(userDisciplines, eq(userDisciplines.userId, users.id))
      .limit(1);

    assertFound(user);
    return user;
  });

export const updateUserServerFn = createServerFn({
  method: "POST",
})
  .validator(updateUserSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { location, socials, ...updateData } = data;

    const userId = context.user.id;

    const promises: Promise<unknown>[] = [
      db.update(users).set(updateData).where(eq(users.id, userId)),
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
  .validator(getUserFollowsSchema)
  .handler(async ({ data: input }) => {
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
          .where(eq(userFollows.followedByUserId, input.userId))
          .orderBy(asc(users.id)),

        db
          .select({
            avatarUrl: users.avatarUrl,
            id: users.id,
            name: users.name,
          })
          .from(userFollows)
          .leftJoin(users, eq(userFollows.followedByUserId, users.id))
          .where(eq(userFollows.followedUserId, input.userId))
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

export const followUserServerFn = createServerFn({
  method: "POST",
})
  .validator(followUserSchema)
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
  .validator(unfollowUserSchema)
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
