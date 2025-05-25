import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "~/db";
import { userLocations, users, userSocials } from "~/db/schema";
import { invariant } from "~/lib/invariant";
import { getUserSchema } from "~/lib/users/schemas";
import { updateUserSchema } from "~/models/users";
import { authMiddleware } from "~/server/middleware/auth";

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
      .where(eq(users.id, data.userId))
      .leftJoin(userLocations, eq(userLocations.userId, users.id))
      .leftJoin(userSocials, eq(userSocials.userId, users.id))
      // .leftJoin(userDisciplines, eq(userDisciplines.userId, users.id))
      .limit(1);

    invariant(user, "User not found");
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
  });
