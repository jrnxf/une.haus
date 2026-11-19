import { count, eq } from "drizzle-orm"
import { z } from "zod"

import {
  posts,
  riuSets,
  riuSubmissions,
  userFollows,
  userLocations,
  userSocials,
  users,
} from "~/db/schema"
import { ToolError, defineTool } from "~/mcp/tools/define"

// The public profile. It mirrors getUser in src/lib/users/ops.server.ts,
// minus the email column. Never add email here.
const profileOutput = z.object({
  id: z.number(),
  name: z.string(),
  bio: z.string().nullable(),
  avatarId: z.string().nullable(),
  disciplines: z.array(z.string()).nullable(),
  createdAt: z.string(),
  location: z.object({ label: z.string(), countryName: z.string() }).nullable(),
  socials: z.record(z.string(), z.string()),
  counts: z.object({
    followers: z.number(),
    following: z.number(),
    posts: z.number(),
    riuSets: z.number(),
    riuSubmissions: z.number(),
  }),
})

export const getUserTool = defineTool({
  name: "get_user",
  title: "Get user",
  description:
    "Get one une.haus rider's public profile by numeric user id: name, bio, disciplines, location, social links, follower counts and how much they have posted. Reads live production data.",
  inputSchema: z.object({
    userId: z.number().int().positive().describe("the une.haus user id"),
  }),
  outputSchema: profileOutput,
  run: async (db, { userId }) => {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        bio: users.bio,
        avatarId: users.avatarId,
        disciplines: users.disciplines,
        createdAt: users.createdAt,
        locationLabel: userLocations.label,
        countryName: userLocations.countryName,
        facebook: userSocials.facebook,
        instagram: userSocials.instagram,
        spotify: userSocials.spotify,
        tiktok: userSocials.tiktok,
        twitter: userSocials.twitter,
        youtube: userSocials.youtube,
      })
      .from(users)
      .leftJoin(userLocations, eq(userLocations.userId, users.id))
      .leftJoin(userSocials, eq(userSocials.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) throw new ToolError(`no user with id ${userId}`)

    // Five small counts, run at the same time.
    const countWhere = async (
      table: typeof posts | typeof riuSets | typeof riuSubmissions,
    ) => {
      const [row] = await db
        .select({ n: count() })
        .from(table)
        .where(eq(table.userId, userId))
      return row?.n ?? 0
    }
    const [followers, following, postCount, setCount, submissionCount] =
      await Promise.all([
        db
          .select({ n: count() })
          .from(userFollows)
          .where(eq(userFollows.followedUserId, userId))
          .then(([row]) => row?.n ?? 0),
        db
          .select({ n: count() })
          .from(userFollows)
          .where(eq(userFollows.followedByUserId, userId))
          .then(([row]) => row?.n ?? 0),
        countWhere(posts),
        countWhere(riuSets),
        countWhere(riuSubmissions),
      ])

    const socials = Object.fromEntries(
      Object.entries({
        facebook: user.facebook,
        instagram: user.instagram,
        spotify: user.spotify,
        tiktok: user.tiktok,
        twitter: user.twitter,
        youtube: user.youtube,
      }).filter((entry): entry is [string, string] => Boolean(entry[1])),
    )

    return {
      id: user.id,
      name: user.name,
      bio: user.bio,
      avatarId: user.avatarId,
      disciplines: user.disciplines,
      createdAt: user.createdAt.toISOString(),
      location:
        user.locationLabel && user.countryName
          ? { label: user.locationLabel, countryName: user.countryName }
          : null,
      socials,
      counts: {
        followers,
        following,
        posts: postCount,
        riuSets: setCount,
        riuSubmissions: submissionCount,
      },
    }
  },
})
