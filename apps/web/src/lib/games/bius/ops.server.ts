import "@tanstack/react-start/server-only"
import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "~/db"
import { biuSetLikes, biuSetMessages, biuSets, bius } from "~/db/schema"
import { createChainGame } from "~/lib/games/chain-game.server"
import { invariant } from "~/lib/invariant"

const biuChain = createChainGame({
  entityType: "biuSet",
  logTag: "games.bius",
  copy: {
    continueOwnSet: "You cannot back up your own set",
    alreadyContinued: "This set has already been backed up",
  },
  assertRoundOpen: async (exec, roundId) => {
    const round = await exec.query.bius.findFirst({
      where: eq(bius.id, roundId),
      columns: { id: true },
    })
    invariant(round, "Round not found")
  },
  findLatestSet: (exec, roundId) =>
    exec.query.biuSets.findFirst({
      where: and(eq(biuSets.biuId, roundId), isNull(biuSets.deletedAt)),
      orderBy: desc(biuSets.position),
    }),
  findChildSet: (exec, parentSetId) =>
    exec.query.biuSets.findFirst({
      where: and(
        eq(biuSets.parentSetId, parentSetId),
        isNull(biuSets.deletedAt),
      ),
      columns: { id: true },
    }),
  findSet: (exec, setId) =>
    exec.query.biuSets.findFirst({ where: eq(biuSets.id, setId) }),
  insertSet: async (values) => {
    const [set] = await db
      .insert(biuSets)
      .values({
        biuId: values.roundId,
        userId: values.userId,
        muxAssetId: values.muxAssetId,
        name: values.name,
        position: values.position,
        parentSetId: values.parentSetId,
      })
      .returning()
    return set
  },
  insertInstructions: async (setId, userId, content) => {
    await db.insert(biuSetMessages).values({ biuSetId: setId, userId, content })
  },
  renameSet: async (setId, userId, name) => {
    const [updated] = await db
      .update(biuSets)
      .set({ name })
      .where(and(eq(biuSets.id, setId), eq(biuSets.userId, userId)))
      .returning()
    return updated
  },
  softDeleteSet: async (setId) => {
    await db
      .update(biuSets)
      .set({ deletedAt: new Date() })
      .where(eq(biuSets.id, setId))
  },
  purgeSetEngagement: async (setId) => {
    // Message likes cascade from messages.
    await db.delete(biuSetMessages).where(eq(biuSetMessages.biuSetId, setId))
    await db.delete(biuSetLikes).where(eq(biuSetLikes.biuSetId, setId))
  },
  hardDeleteSet: async (setId) => {
    await db.delete(biuSets).where(eq(biuSets.id, setId))
  },
})

export const createFirstBiuSet = biuChain.createFirstSet
export const backUpBiuSet = biuChain.continueSet
export const updateBiuSet = biuChain.updateSet
export const deleteBiuSet = biuChain.deleteSet

const MAX_ACTIVE_ROUNDS = 3

export async function getChains() {
  return db.query.bius.findMany({
    orderBy: desc(bius.createdAt),
    with: {
      sets: {
        orderBy: desc(biuSets.position),
        with: {
          user: {
            columns: { id: true, name: true, avatarId: true },
          },
          video: {
            columns: { playbackId: true },
          },
          likes: {
            with: {
              user: {
                columns: { id: true, name: true, avatarId: true },
              },
            },
          },
          messages: {
            columns: { id: true },
          },
          parentSet: {
            columns: { id: true, name: true },
            with: {
              user: {
                columns: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  })
}

export async function startRound() {
  // Count check and insert are one atomic statement (D1 has no interactive
  // transactions), so concurrent callers can never overshoot the cap.
  const rows = (await db.all(
    sql`INSERT INTO bius (created_at)
        SELECT CAST(unixepoch('subsec') * 1000 AS INTEGER)
        WHERE (SELECT COUNT(*) FROM bius) < ${MAX_ACTIVE_ROUNDS}
        RETURNING id`,
  )) as { id: number }[]

  invariant(
    rows[0] !== undefined,
    `Maximum of ${MAX_ACTIVE_ROUNDS} active rounds reached`,
  )

  const round = await db.query.bius.findFirst({
    where: eq(bius.id, rows[0].id),
  })
  invariant(round, "Round not found after insert")
  return { round }
}

export async function getSet({
  data: input,
}: {
  data: {
    setId: number
  }
}) {
  const set = await db.query.biuSets.findFirst({
    where: eq(biuSets.id, input.setId),
    with: {
      biu: {
        columns: { id: true },
      },
      user: {
        columns: { id: true, name: true, avatarId: true },
      },
      video: {
        columns: { playbackId: true },
      },
      parentSet: {
        columns: { id: true, name: true },
        with: {
          user: {
            columns: { id: true, name: true, avatarId: true },
          },
          video: {
            columns: { playbackId: true },
          },
        },
      },
      likes: {
        with: {
          user: {
            columns: { id: true, name: true, avatarId: true },
          },
        },
      },
      messages: {
        columns: { id: true, content: true, createdAt: true },
        with: {
          user: {
            columns: { id: true, name: true, avatarId: true },
          },
          likes: {
            with: {
              user: {
                columns: { id: true, name: true, avatarId: true },
              },
            },
          },
        },
      },
    },
  })

  if (!set) return set

  const childSet = await db.query.biuSets.findFirst({
    where: and(eq(biuSets.parentSetId, set.id), isNull(biuSets.deletedAt)),
    columns: { id: true, name: true },
  })

  return { ...set, isLatest: !childSet, childSet: childSet ?? null }
}
