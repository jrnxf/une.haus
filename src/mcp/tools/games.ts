import { count, desc, eq } from "drizzle-orm"
import { z } from "zod"

import { muxVideos, riuSets, riuSubmissions, rius, users } from "~/db/schema"
import { RIU_STATUSES } from "~/lib/games/rius/lifecycle"
import { prodDb } from "~/mcp/d1"
import { errorResult, jsonResult, videoUrl } from "~/mcp/tools/result"

import type { McpServer } from "@modelcontextprotocol/server"

const roundOutput = z.object({
  roundId: z.number(),
  status: z.enum(RIU_STATUSES).nullable(),
  sets: z.array(
    z.object({
      setId: z.number(),
      name: z.string(),
      instructions: z.string().nullable(),
      setter: z.string(),
      videoUrl: z.string().nullable(),
      submissions: z.number(),
    }),
  ),
})

const setOutput = z.object({
  setId: z.number(),
  roundId: z.number(),
  name: z.string(),
  instructions: z.string().nullable(),
  setter: z.object({ id: z.number(), name: z.string() }),
  videoUrl: z.string().nullable(),
  submissions: z.array(
    z.object({
      submissionId: z.number(),
      rider: z.object({ id: z.number(), name: z.string() }),
      createdAt: z.string(),
      videoUrl: z.string().nullable(),
    }),
  ),
})

// "last" is the newest archived round. A number picks a round by id.
const roundArg = z
  .union([z.enum(["active", "upcoming", "last"]), z.number().int().positive()])
  .default("active")
  .describe(
    "active = this week, upcoming = next week (sets only), last = the round that just ended, or a round id",
  )

async function findRoundId(round: z.infer<typeof roundArg>) {
  if (typeof round === "number") {
    const [row] = await prodDb
      .select({ id: rius.id })
      .from(rius)
      .where(eq(rius.id, round))
      .limit(1)
    return row?.id
  }
  const status = round === "last" ? "archived" : round
  const [row] = await prodDb
    .select({ id: rius.id })
    .from(rius)
    .where(eq(rius.status, status))
    .orderBy(desc(rius.id))
    .limit(1)
  return row?.id
}

export function registerGameTools(server: McpServer) {
  server.registerTool(
    "get_riu_round",
    {
      title: "Get RIU round",
      description:
        "Get a Rack It Up (RIU) round: its sets, who set each one, the set video and how many riders landed it. RIU is the weekly une.haus game: riders post sets (tricks) for the upcoming week, then everyone tries to land them while the round is active. Call get_riu_set for the landings of one set.",
      inputSchema: z.object({ round: roundArg }),
      outputSchema: roundOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ round }) => {
      const roundId = await findRoundId(round)
      if (!roundId) return errorResult(`no RIU round matches ${round}`)

      const [meta] = await prodDb
        .select({ status: rius.status })
        .from(rius)
        .where(eq(rius.id, roundId))
        .limit(1)

      // A grouped left join counts landings per set in one query.
      const sets = await prodDb
        .select({
          setId: riuSets.id,
          name: riuSets.name,
          instructions: riuSets.instructions,
          setter: users.name,
          playbackId: muxVideos.playbackId,
          submissions: count(riuSubmissions.id),
        })
        .from(riuSets)
        .innerJoin(users, eq(users.id, riuSets.userId))
        .leftJoin(muxVideos, eq(muxVideos.assetId, riuSets.muxAssetId))
        .leftJoin(riuSubmissions, eq(riuSubmissions.riuSetId, riuSets.id))
        .where(eq(riuSets.riuId, roundId))
        .groupBy(riuSets.id)
        .orderBy(riuSets.id)

      return jsonResult({
        roundId,
        status: meta?.status ?? null,
        sets: sets.map(({ playbackId, ...set }) => ({
          ...set,
          videoUrl: videoUrl(playbackId),
        })),
      })
    },
  )

  server.registerTool(
    "get_riu_set",
    {
      title: "Get RIU set",
      description:
        "Get one RIU set by id, with every submission: who landed it, when, and a link to their video.",
      inputSchema: z.object({
        setId: z.number().int().positive().describe("the RIU set id"),
      }),
      outputSchema: setOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ setId }) => {
      const [set] = await prodDb
        .select({
          setId: riuSets.id,
          roundId: riuSets.riuId,
          name: riuSets.name,
          instructions: riuSets.instructions,
          setterId: users.id,
          setterName: users.name,
          playbackId: muxVideos.playbackId,
        })
        .from(riuSets)
        .innerJoin(users, eq(users.id, riuSets.userId))
        .leftJoin(muxVideos, eq(muxVideos.assetId, riuSets.muxAssetId))
        .where(eq(riuSets.id, setId))
        .limit(1)
      if (!set) return errorResult(`no RIU set with id ${setId}`)

      const submissions = await prodDb
        .select({
          submissionId: riuSubmissions.id,
          riderId: users.id,
          riderName: users.name,
          createdAt: riuSubmissions.createdAt,
          playbackId: muxVideos.playbackId,
        })
        .from(riuSubmissions)
        .innerJoin(users, eq(users.id, riuSubmissions.userId))
        .leftJoin(muxVideos, eq(muxVideos.assetId, riuSubmissions.muxAssetId))
        .where(eq(riuSubmissions.riuSetId, setId))
        .orderBy(riuSubmissions.id)

      return jsonResult({
        setId: set.setId,
        roundId: set.roundId,
        name: set.name,
        instructions: set.instructions,
        setter: { id: set.setterId, name: set.setterName },
        videoUrl: videoUrl(set.playbackId),
        submissions: submissions.map((s) => ({
          submissionId: s.submissionId,
          rider: { id: s.riderId, name: s.riderName },
          createdAt: s.createdAt.toISOString(),
          videoUrl: videoUrl(s.playbackId),
        })),
      })
    },
  )
}
