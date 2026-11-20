import { and, asc, count, eq, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { z } from "zod"

import {
  TRICK_RELATIONSHIP_TYPES,
  muxVideos,
  trickLikes,
  trickRelationships,
  trickVideos,
  tricks,
} from "~/db/schema"
import { ToolError, defineTool } from "~/mcp/tools/define"
import { videoUrl } from "~/mcp/tools/result"

const trickOutput = z.object({
  id: z.number(),
  name: z.string(),
  alternateNames: z.array(z.string()).nullable(),
  description: z.string().nullable(),
  inventedBy: z.string().nullable(),
  yearLanded: z.number().nullable(),
  notes: z.string().nullable(),
  likes: z.number(),
  relationships: z.array(
    z.object({
      type: z.enum(TRICK_RELATIONSHIP_TYPES),
      // outgoing: the other trick is this trick's prerequisite (or related).
      // incoming: this trick is the other trick's prerequisite (or related).
      direction: z.enum(["outgoing", "incoming"]),
      trick: z.object({ id: z.number(), name: z.string() }),
    }),
  ),
  videos: z.array(
    z.object({
      videoUrl: z.string().nullable(),
      sortOrder: z.number(),
    }),
  ),
})

const otherTricks = alias(tricks, "other_tricks")

export const getTrickTool = defineTool({
  name: "get_trick",
  title: "Get trick",
  description:
    "Get one trick from the une.haus glossary by id: names, description, who invented it and when, notes, likes, its links to other tricks and its approved videos. A relationship with direction outgoing means the other trick is a prerequisite of (or related to) this one. Incoming means this trick is a prerequisite of the other. Call search_tricks to find an id.",
  inputSchema: z.object({
    trickId: z.number().int().positive().describe("the trick id"),
  }),
  outputSchema: trickOutput,
  run: async (db, { trickId }) => {
    const [trick] = await db
      .select({
        id: tricks.id,
        name: tricks.name,
        alternateNames: tricks.alternateNames,
        description: tricks.description,
        inventedBy: tricks.inventedBy,
        yearLanded: tricks.yearLanded,
        notes: tricks.notes,
      })
      .from(tricks)
      .where(eq(tricks.id, trickId))
      .limit(1)
    if (!trick) throw new ToolError(`no trick with id ${trickId}`)

    const [likes, relationships, videos] = await Promise.all([
      db
        .select({ n: count() })
        .from(trickLikes)
        .where(eq(trickLikes.trickId, trickId))
        .then(([row]) => row?.n ?? 0),
      // Both ends in one query: join the other trick on whichever side is
      // not this one.
      db
        .select({
          type: trickRelationships.type,
          sourceTrickId: trickRelationships.sourceTrickId,
          otherId: otherTricks.id,
          otherName: otherTricks.name,
        })
        .from(trickRelationships)
        .innerJoin(
          otherTricks,
          or(
            and(
              eq(trickRelationships.sourceTrickId, trickId),
              eq(otherTricks.id, trickRelationships.targetTrickId),
            ),
            and(
              eq(trickRelationships.targetTrickId, trickId),
              eq(otherTricks.id, trickRelationships.sourceTrickId),
            ),
          ),
        )
        .where(
          or(
            eq(trickRelationships.sourceTrickId, trickId),
            eq(trickRelationships.targetTrickId, trickId),
          ),
        )
        .orderBy(asc(trickRelationships.id)),
      // Only approved videos, in the order the site shows: pinned first,
      // then by sortOrder.
      db
        .select({
          playbackId: muxVideos.playbackId,
          sortOrder: trickVideos.sortOrder,
        })
        .from(trickVideos)
        .leftJoin(muxVideos, eq(muxVideos.assetId, trickVideos.muxAssetId))
        .where(
          and(
            eq(trickVideos.trickId, trickId),
            eq(trickVideos.status, "active"),
          ),
        )
        .orderBy(
          sql`${trickVideos.pinnedRank} asc nulls last`,
          asc(trickVideos.sortOrder),
        ),
    ])

    return {
      ...trick,
      likes,
      relationships: relationships.map((r) => ({
        type: r.type,
        direction:
          r.sourceTrickId === trickId
            ? ("outgoing" as const)
            : ("incoming" as const),
        trick: { id: r.otherId, name: r.otherName },
      })),
      videos: videos.map((v) => ({
        videoUrl: videoUrl(v.playbackId),
        sortOrder: v.sortOrder,
      })),
    }
  },
})
