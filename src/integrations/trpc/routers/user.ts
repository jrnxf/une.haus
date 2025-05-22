import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { and, asc, eq, gt, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/db";
import {
  USER_DISCIPLINES,
  userFollows,
  userLocations,
  userSocials,
  users,
} from "~/db/schema";
import { authProcedure, publicProcedure } from "~/integrations/trpc/init";
import { updateUserSchema } from "~/models/users";

export const userRouter = {
  all: publicProcedure.query(async () => {
    return await db
      .select({
        avatarUrl: users.avatarUrl,
        id: users.id,
        name: users.name,
      })
      .from(users)
      .orderBy(asc(users.id));
  }),
  follow: authProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx: { db, session }, input }) => {
      await db.insert(userFollows).values({
        followedByUserId: session.user.id,
        followedUserId: input.userId,
      });
    }),
  follows: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [followedUsersResult, followedByUsersResult] =
        await Promise.allSettled([
          ctx.db
            .select({
              avatarUrl: users.avatarUrl,
              id: users.id,
              name: users.name,
            })
            .from(userFollows)
            .leftJoin(users, eq(userFollows.followedUserId, users.id))
            .where(eq(userFollows.followedByUserId, input.userId))
            .orderBy(asc(users.id)),

          ctx.db
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
    }),
  get: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          disciplines: users.disciplines,
          email: users.email,
          id: users.id,
          location: {
            countryName: userLocations.countryName,
            countryCode: userLocations.countryCode,
            formattedAddress: userLocations.formattedAddress,
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
        .where(eq(users.id, input.userId))
        .leftJoin(userLocations, eq(userLocations.userId, users.id))
        .leftJoin(userSocials, eq(userSocials.userId, users.id))
        // .leftJoin(userDisciplines, eq(userDisciplines.userId, users.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),
  list: publicProcedure
    .input(
      z.object({
        cursor: z.number().nullish(),
        disciplines: z.array(z.enum(USER_DISCIPLINES)).optional(),
        limit: z.number().min(25).max(50).default(25),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db
        .select({
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          disciplines: users.disciplines,
          email: users.email,
          id: users.id,
          location: {
            countryCode: userLocations.countryCode,
            formattedAddress: userLocations.formattedAddress,
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
            input.search ? ilike(users.name, `%${input.search}%`) : undefined,
            input.disciplines && input.disciplines.length > 0
              ? sql`${users.disciplines}::jsonb @> ${sql.raw(`'${JSON.stringify(input.disciplines)}'`)}::jsonb`
              : undefined,
            input.cursor ? gt(users.id, input.cursor) : undefined,
          ),
        )
        .orderBy(asc(users.id))
        .limit(input.limit);
    }),
  unfollow: authProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx: { db, session }, input }) => {
      await db
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followedByUserId, session.user.id),
            eq(userFollows.followedUserId, input.userId),
          ),
        );
    }),
  update: authProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx: { db, session }, input }) => {
      const { location, socials, ...data } = input;

      const userId = session.user.id;

      const promises: Promise<unknown>[] = [
        db.update(users).set(data).where(eq(users.id, userId)),
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
              set: location,
              target: userLocations.userId,
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
            .onConflictDoUpdate({ set: socials, target: userSocials.userId }),
        );
      }

      await Promise.all(promises);
    }),
} satisfies TRPCRouterRecord;
