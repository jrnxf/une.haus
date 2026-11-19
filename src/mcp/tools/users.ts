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
import { prodDb } from "~/mcp/d1"

import type { McpServer } from "@modelcontextprotocol/server"

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

export function registerUserTools(server: McpServer) {
  server.registerTool(
    "get_user",
    {
      title: "Get user",
      description:
        "Get one une.haus rider's public profile by numeric user id: name, bio, disciplines, location, social links, follower counts and how much they have posted. Reads live production data.",
      inputSchema: z.object({
        userId: z.number().int().positive().describe("the une.haus user id"),
      }),
      outputSchema: profileOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ userId }) => {
      const [user] = await prodDb
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

      if (!user) {
        // isError puts the failure in front of the model as a normal result,
        // so it can correct itself instead of the whole call failing.
        return {
          isError: true,
          content: [{ type: "text", text: `no user with id ${userId}` }],
        }
      }

      // Five small counts. Each is one HTTP round trip to D1.
      const countWhere = async (
        table: typeof posts | typeof riuSets | typeof riuSubmissions,
      ) => {
        const [row] = await prodDb
          .select({ n: count() })
          .from(table)
          .where(eq(table.userId, userId))
        return row?.n ?? 0
      }
      const [followers, following, postCount, setCount, submissionCount] =
        await Promise.all([
          prodDb
            .select({ n: count() })
            .from(userFollows)
            .where(eq(userFollows.followedUserId, userId))
            .then(([row]) => row?.n ?? 0),
          prodDb
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

      const output = {
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

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      }
    },
  )
}
