import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, desc, eq, isNull, sql } from "drizzle-orm"

import {
  backUpSetSchema,
  createFirstSetSchema,
  deleteSetSchema,
  getSetSchema,
  startRoundSchema,
} from "./schemas"
import { db } from "~/db"
import { bius, biuSetLikes, biuSetMessages, biuSets } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import {
  adminOnlyMiddleware,
  authMiddleware,
  authOptionalMiddleware,
} from "~/lib/middleware"
import { notifyFollowers } from "~/lib/notifications/helpers"

const MAX_ACTIVE_ROUNDS = 3

// Get all chains with all sets (ordered by position desc for UI)
export const getChainsServerFn = createServerFn({ method: "GET" })
  .middleware([authOptionalMiddleware])
  .handler(async () => {
    const chains = await db.query.bius.findMany({
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

    return chains
  })

// Start a new BIU round (admin only)
export const startRoundServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(startRoundSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    const activeRounds = await db.query.bius.findMany({
      columns: { id: true },
    })

    invariant(
      activeRounds.length < MAX_ACTIVE_ROUNDS,
      `Maximum of ${MAX_ACTIVE_ROUNDS} active rounds reached`,
    )

    const [round] = await db.insert(bius).values({}).returning()

    return { round }
  })

// Create first set in an existing empty round
export const createFirstSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(createFirstSetSchema))
  .middleware([authMiddleware])
  .handler(createFirstBiuSetImpl)

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

export async function createFirstBiuSetImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    instructions?: string
    muxAssetId: string
    name: string
    roundId: number
  }
}) {
  const userId = context.user.id

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7201, ${input.roundId})`)

    const round = await tx.query.bius.findFirst({
      where: eq(bius.id, input.roundId),
      columns: { id: true },
    })

    invariant(round, "Round not found")

    const existingSet = await tx.query.biuSets.findFirst({
      where: and(eq(biuSets.biuId, input.roundId), isNull(biuSets.deletedAt)),
      columns: { id: true },
    })

    invariant(!existingSet, "Round already has a first set")

    const [set] = await tx
      .insert(biuSets)
      .values({
        biuId: input.roundId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: 1,
        parentSetId: null,
      })
      .returning()

    const instructions = input.instructions?.trim()
    if (instructions) {
      await tx.insert(biuSetMessages).values({
        biuSetId: set.id,
        userId,
        content: instructions,
      })
    }

    return set
  })
}

// Get single set with full details
export const getSetServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getSetSchema))
  .handler(async ({ data: input }) => {
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

    // Check if this is the latest set in its chain (no non-deleted children)
    const childSet = await db.query.biuSets.findFirst({
      where: and(eq(biuSets.parentSetId, set.id), isNull(biuSets.deletedAt)),
      columns: { id: true, name: true },
    })

    return { ...set, isLatest: !childSet, childSet: childSet ?? null }
  })

// Back up a set (continue the chain)
export const backUpSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(backUpSetSchema))
  .middleware([authMiddleware])
  .handler(backUpBiuSetImpl)

export async function backUpBiuSetImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    instructions?: string
    muxAssetId: string
    name: string
    roundId: number
  }
}) {
  const userId = context.user.id

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7202, ${input.roundId})`)

    const round = await tx.query.bius.findFirst({
      where: eq(bius.id, input.roundId),
      columns: { id: true },
    })

    invariant(round, "Round not found")

    const parentSet = await tx.query.biuSets.findFirst({
      where: and(eq(biuSets.biuId, input.roundId), isNull(biuSets.deletedAt)),
      orderBy: desc(biuSets.position),
      columns: { id: true, userId: true, position: true },
    })

    invariant(parentSet, "Round has no sets yet")
    invariant(parentSet.userId !== userId, "You cannot back up your own set")

    // Ensure this latest set is still uncontinued.
    const existingBackup = await tx.query.biuSets.findFirst({
      where: and(
        eq(biuSets.parentSetId, parentSet.id),
        isNull(biuSets.deletedAt),
      ),
      columns: { id: true },
    })

    invariant(!existingBackup, "This set has already been backed up")

    const [set] = await tx
      .insert(biuSets)
      .values({
        biuId: input.roundId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: parentSet.position + 1,
        parentSetId: parentSet.id,
      })
      .returning()

    const instructions = input.instructions?.trim()
    if (instructions) {
      await tx.insert(biuSetMessages).values({
        biuSetId: set.id,
        userId,
        content: instructions,
      })
    }

    // Notify followers about the new BIU set
    notifyFollowers({
      actorId: userId,
      actorName: context.user.name,
      actorAvatarId: context.user.avatarId,
      type: "new_content",
      entityType: "biuSet",
      entityId: set.id,
      entityTitle: set.name,
    }).catch(console.error)

    return set
  })
}

// Delete set (owner only)
export const deleteSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteSetSchema))
  .middleware([authMiddleware])
  .handler(deleteBiuSetImpl)

export async function deleteBiuSetImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    setId: number
  }
}) {
  const userId = context.user.id

  const set = await db.query.biuSets.findFirst({
    where: eq(biuSets.id, input.setId),
  })

  invariant(set, "Set not found")
  invariant(set.userId === userId, "Access denied")
  invariant(!set.deletedAt, "Set is already deleted")

  // Check if this set has non-deleted children
  const childSet = await db.query.biuSets.findFirst({
    where: and(eq(biuSets.parentSetId, set.id), isNull(biuSets.deletedAt)),
  })

  if (childSet) {
    // Soft delete: keep row for chain integrity, remove engagement data
    await db
      .update(biuSets)
      .set({ deletedAt: new Date() })
      .where(eq(biuSets.id, input.setId))

    // Hard-delete engagement data (message likes cascade from messages)
    await db
      .delete(biuSetMessages)
      .where(eq(biuSetMessages.biuSetId, input.setId))
    await db.delete(biuSetLikes).where(eq(biuSetLikes.biuSetId, input.setId))

    return { type: "soft" as const }
  }

  // Hard delete: no children, remove the row entirely
  await db.delete(biuSets).where(eq(biuSets.id, input.setId))

  return { type: "hard" as const }
}
