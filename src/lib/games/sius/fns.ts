import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, count, desc, eq, isNull, lte, sql } from "drizzle-orm"
import pluralize from "pluralize"

import {
  addSetSchema,
  archiveRoundSchema,
  createFirstSetSchema,
  deleteSetSchema,
  getArchivedRoundSchema,
  getSetSchema,
  removeArchiveVoteSchema,
  startRoundSchema,
  voteToArchiveSchema,
} from "./schemas"
import { db } from "~/db"
import {
  siuArchiveVotes,
  siuSetLikes,
  siuSetMessages,
  siuSets,
  sius,
  users,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"
import {
  adminOnlyMiddleware,
  authMiddleware,
  authOptionalMiddleware,
} from "~/lib/middleware"
import {
  createNotification,
  notifyFollowers,
} from "~/lib/notifications/helpers"

const ARCHIVE_VOTE_THRESHOLD = 5
const MAX_ACTIVE_ROUNDS = 3

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

// Get active rounds with all sets (ordered by position desc for UI)
export const getActiveRoundsServerFn = createServerFn({ method: "GET" })
  .middleware([authOptionalMiddleware])
  .handler(async () => {
    const activeRounds = await db.query.sius.findMany({
      where: eq(sius.status, "active"),
      orderBy: desc(sius.createdAt),
      with: {
        sets: {
          orderBy: desc(siuSets.position),
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
        archiveVotes: {
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
          },
        },
      },
    })

    return activeRounds
  })

// Get single set with full details
export const getSetServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getSetSchema))
  .handler(async ({ data: input }) => {
    const set = await db.query.siuSets.findFirst({
      where: eq(siuSets.id, input.setId),
      with: {
        siu: {
          columns: { id: true, status: true },
          with: {
            archiveVotes: {
              with: {
                user: {
                  columns: { id: true, name: true, avatarId: true },
                },
              },
            },
          },
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

    // Check if this is the latest set in its round (no non-deleted children)
    const childSet = await db.query.siuSets.findFirst({
      where: and(eq(siuSets.parentSetId, set.id), isNull(siuSets.deletedAt)),
      columns: { id: true, name: true },
    })

    return { ...set, childSet, isLatest: !childSet }
  })

// Start a new round (admin only)
export const startRoundServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(startRoundSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    // Check if max active rounds reached
    const activeRounds = await db.query.sius.findMany({
      where: eq(sius.status, "active"),
      columns: { id: true },
    })

    invariant(
      activeRounds.length < MAX_ACTIVE_ROUNDS,
      `Maximum of ${MAX_ACTIVE_ROUNDS} active rounds reached`,
    )

    // Create new round
    const [round] = await db
      .insert(sius)
      .values({ status: "active" })
      .returning()

    return { round }
  })

// Create first set in an existing empty round
export const createFirstSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(createFirstSetSchema))
  .middleware([authMiddleware])
  .handler(createFirstSiuSetImpl)

export async function createFirstSiuSetImpl({
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
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7101, ${input.roundId})`)

    const round = await tx.query.sius.findFirst({
      where: eq(sius.id, input.roundId),
      columns: { id: true, status: true },
    })

    invariant(round, "Round not found")
    invariant(round.status === "active", "Round is not active")

    const existingSet = await tx.query.siuSets.findFirst({
      where: and(eq(siuSets.siuId, input.roundId), isNull(siuSets.deletedAt)),
      columns: { id: true },
    })

    invariant(!existingSet, "Round already has a first set")

    const [set] = await tx
      .insert(siuSets)
      .values({
        siuId: input.roundId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: 1,
        parentSetId: null,
      })
      .returning()

    const instructions = input.instructions?.trim()
    if (instructions) {
      await tx.insert(siuSetMessages).values({
        siuSetId: set.id,
        userId,
        content: instructions,
      })
    }

    return set
  })
}

// Add set (continue the round with full line + new trick)
export const addSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(addSetSchema))
  .middleware([authMiddleware])
  .handler(addSiuSetImpl)

export async function addSiuSetImpl({
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
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7102, ${input.roundId})`)

    const round = await tx.query.sius.findFirst({
      where: eq(sius.id, input.roundId),
      columns: { id: true, status: true },
    })

    invariant(round, "Round not found")
    invariant(round.status === "active", "Round is not active")

    const parentSet = await tx.query.siuSets.findFirst({
      where: and(eq(siuSets.siuId, input.roundId), isNull(siuSets.deletedAt)),
      orderBy: desc(siuSets.position),
      columns: { id: true, userId: true, position: true },
    })

    invariant(parentSet, "Round has no sets yet")
    invariant(parentSet.userId !== userId, "You cannot stack up your own trick")

    const existingSet = await tx.query.siuSets.findFirst({
      where: and(
        eq(siuSets.parentSetId, parentSet.id),
        isNull(siuSets.deletedAt),
      ),
      columns: { id: true },
    })

    invariant(!existingSet, "This set has already been continued")

    const [set] = await tx
      .insert(siuSets)
      .values({
        siuId: input.roundId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: parentSet.position + 1,
        parentSetId: parentSet.id,
      })
      .returning()

    const instructions = input.instructions?.trim()
    if (instructions) {
      await tx.insert(siuSetMessages).values({
        siuSetId: set.id,
        userId,
        content: instructions,
      })
    }

    notifyFollowers({
      actorId: userId,
      actorName: context.user.name,
      actorAvatarId: context.user.avatarId,
      type: "new_content",
      entityType: "siuSet",
      entityId: set.id,
      entityTitle: set.name,
    }).catch(console.error)

    return set
  })
}

// Vote to archive round
export const voteToArchiveServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(voteToArchiveSchema))
  .middleware([authMiddleware])
  .handler(voteToArchiveImpl)

export async function voteToArchiveImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    roundId: number
  }
}) {
  const userId = context.user.id

  const round = await db.query.sius.findFirst({
    where: eq(sius.id, input.roundId),
  })

  invariant(round, "Round not found")
  invariant(round.status === "active", "Round is not active")

  // Check if already voted
  const existingVote = await db.query.siuArchiveVotes.findFirst({
    where: and(
      eq(siuArchiveVotes.siuId, input.roundId),
      eq(siuArchiveVotes.userId, userId),
    ),
  })

  invariant(!existingVote, "You have already voted to archive this round")

  // Add vote
  await db.insert(siuArchiveVotes).values({
    siuId: input.roundId,
    userId,
  })

  // Check vote count
  const [result] = await db
    .select({ count: count() })
    .from(siuArchiveVotes)
    .where(eq(siuArchiveVotes.siuId, input.roundId))

  const voteCount = result?.count ?? 0

  // If threshold reached, notify admins
  if (voteCount === ARCHIVE_VOTE_THRESHOLD) {
    // Get all admins
    const admins = await db.query.users.findMany({
      where: eq(users.type, "admin"),
      columns: { id: true },
    })

    // Get round details for notification
    const roundWithSets = await db.query.sius.findFirst({
      where: eq(sius.id, input.roundId),
      with: {
        sets: {
          orderBy: desc(siuSets.position),
          limit: 1,
        },
      },
    })

    const latestSet = roundWithSets?.sets[0]

    // Notify each admin
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        actorId: userId,
        type: "archive_request",
        entityType: "siu",
        entityId: input.roundId,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityTitle: `Stack It Up round with ${latestSet?.position ?? 0} ${pluralize("trick", latestSet?.position ?? 0)}`,
          entityPreview: `${voteCount} ${pluralize("vote", voteCount)} to archive`,
        },
      })
    }
  }

  return { voteCount, thresholdReached: voteCount >= ARCHIVE_VOTE_THRESHOLD }
}

// Remove archive vote
export const removeArchiveVoteServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(removeArchiveVoteSchema))
  .middleware([authMiddleware])
  .handler(removeArchiveVoteImpl)

export async function removeArchiveVoteImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    roundId: number
  }
}) {
  const userId = context.user.id

  await db
    .delete(siuArchiveVotes)
    .where(
      and(
        eq(siuArchiveVotes.siuId, input.roundId),
        eq(siuArchiveVotes.userId, userId),
      ),
    )

  const [result] = await db
    .select({ count: count() })
    .from(siuArchiveVotes)
    .where(eq(siuArchiveVotes.siuId, input.roundId))

  return { voteCount: result?.count ?? 0 }
}

// Archive round (admin only)
export const archiveRoundServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(archiveRoundSchema))
  .middleware([adminOnlyMiddleware])
  .handler(archiveSiuRoundImpl)

export async function archiveSiuRoundImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    roundId: number
  }
}) {
  const round = await db.query.sius.findFirst({
    where: eq(sius.id, input.roundId),
    with: {
      sets: {
        with: {
          user: {
            columns: { id: true, name: true },
          },
        },
      },
    },
  })

  invariant(round, "Round not found")
  invariant(round.status === "active", "Round is already archived")

  await db
    .update(sius)
    .set({ status: "archived", endedAt: new Date() })
    .where(eq(sius.id, input.roundId))

  const participantIds = [...new Set(round.sets.map((s) => s.userId))]

  for (const participantId of participantIds) {
    await createNotification({
      userId: participantId,
      actorId: context.user.id,
      type: "chain_archived",
      entityType: "siu",
      entityId: input.roundId,
      data: {
        actorName: context.user.name,
        actorAvatarId: context.user.avatarId,
        entityTitle: `Stack It Up round with ${round.sets.length} ${pluralize("trick", round.sets.length)}`,
        entityPreview: "Round has been archived",
      },
    })
  }

  return { success: true }
}

// Delete set (owner only)
export const deleteSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteSetSchema))
  .middleware([authMiddleware])
  .handler(deleteSiuSetImpl)

export async function deleteSiuSetImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    setId: number
  }
}) {
  const userId = context.user.id

  const set = await db.query.siuSets.findFirst({
    where: eq(siuSets.id, input.setId),
  })

  invariant(set, "Set not found")
  invariant(set.userId === userId, "Access denied")
  invariant(!set.deletedAt, "Set is already deleted")

  // Check if this set has non-deleted children
  const childSet = await db.query.siuSets.findFirst({
    where: and(eq(siuSets.parentSetId, set.id), isNull(siuSets.deletedAt)),
  })

  if (childSet) {
    // Soft delete: keep row for round integrity, remove engagement data
    await db
      .update(siuSets)
      .set({ deletedAt: new Date() })
      .where(eq(siuSets.id, input.setId))

    // Hard-delete engagement data (message likes cascade from messages)
    await db
      .delete(siuSetMessages)
      .where(eq(siuSetMessages.siuSetId, input.setId))
    await db.delete(siuSetLikes).where(eq(siuSetLikes.siuSetId, input.setId))

    return { type: "soft" as const }
  }

  // Hard delete: no children, remove the row entirely
  await db.delete(siuSets).where(eq(siuSets.id, input.setId))

  // If this was the only set, archive the round
  if (set.position === 1) {
    await db
      .update(sius)
      .set({ status: "archived", endedAt: new Date() })
      .where(eq(sius.id, set.siuId))
  }

  return { type: "hard" as const }
}

// List archived rounds
export const listArchivedRoundsServerFn = createServerFn({
  method: "GET",
}).handler(listArchivedRoundsImpl)

export async function listArchivedRoundsImpl() {
  const rounds = await db.query.sius.findMany({
    where: eq(sius.status, "archived"),
    columns: { id: true, createdAt: true, endedAt: true },
    orderBy: desc(sius.endedAt),
    with: {
      sets: {
        columns: { id: true, deletedAt: true },
      },
    },
  })

  return rounds.map((round) => ({
    id: round.id,
    createdAt: round.createdAt,
    endedAt: round.endedAt,
    setsCount: round.sets.filter((s) => !s.deletedAt).length,
  }))
}

// Get specific archived round with all sets
export const getArchivedRoundServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getArchivedRoundSchema))
  .handler(getArchivedRoundImpl)

export async function getArchivedRoundImpl({
  data: input,
}: {
  data: {
    roundId: number
  }
}) {
  const round = await db.query.sius.findFirst({
    where: and(eq(sius.id, input.roundId), eq(sius.status, "archived")),
    with: {
      sets: {
        orderBy: desc(siuSets.position),
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
      archiveVotes: {
        with: {
          user: {
            columns: { id: true, name: true, avatarId: true },
          },
        },
      },
    },
  })

  return round ?? null
}

// Get all tricks in the line up to and including the requested set
export const getLineServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getSetSchema))
  .handler(async ({ data: input }) => {
    const set = await db.query.siuSets.findFirst({
      where: eq(siuSets.id, input.setId),
      columns: { siuId: true, position: true },
    })

    if (!set) return []

    // Show the landed line for the current set, not future additions.
    const sets = await db.query.siuSets.findMany({
      where: and(
        eq(siuSets.siuId, set.siuId),
        lte(siuSets.position, set.position),
        isNull(siuSets.deletedAt),
      ),
      orderBy: siuSets.position,
      columns: { id: true, name: true, position: true },
      with: {
        user: {
          columns: { id: true, name: true },
        },
      },
    })

    return sets
  })
