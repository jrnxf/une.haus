import "@tanstack/react-start/server-only"
import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "~/db"
import { biuSetLikes, biuSetMessages, biuSets, bius } from "~/db/schema"
import { createChainGame } from "~/lib/games/chain-game.server"
import { invariant } from "~/lib/invariant"

const biuChain = createChainGame({
  lockBase: 7200,
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
  insertSet: async (tx, values) => {
    const [set] = await tx
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
  insertInstructions: async (tx, setId, userId, content) => {
    await tx.insert(biuSetMessages).values({ biuSetId: setId, userId, content })
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
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7210)`)

    const activeRounds = await tx.query.bius.findMany({
      columns: { id: true },
    })

    invariant(
      activeRounds.length < MAX_ACTIVE_ROUNDS,
      `Maximum of ${MAX_ACTIVE_ROUNDS} active rounds reached`,
    )

    const [round] = await tx.insert(bius).values({}).returning()

    return { round }
  })
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
