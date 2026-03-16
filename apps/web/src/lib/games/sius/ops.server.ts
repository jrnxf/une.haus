import "@tanstack/react-start/server-only"
import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import pluralize from "pluralize"

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
  createNotification,
  deleteNotificationsForEntity,
  notifyFollowers,
} from "~/lib/notifications/helpers.server"

const ARCHIVE_VOTE_THRESHOLD = 5

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

export async function createFirstSiuSet({
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

export async function addSiuSet({
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

export async function voteToArchive({
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

export async function removeArchiveVote({
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

export async function archiveSiuRound({
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

export async function updateSiuSet({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    name: string
    setId: number
  }
}) {
  const userId = context.user.id

  const set = await db.query.siuSets.findFirst({
    where: eq(siuSets.id, input.setId),
    columns: { userId: true },
  })

  invariant(set, "Set not found")
  invariant(set.userId === userId, "Access denied")

  const [updated] = await db
    .update(siuSets)
    .set({ name: input.name })
    .where(and(eq(siuSets.id, input.setId), eq(siuSets.userId, userId)))
    .returning()

  return updated
}

export async function deleteSiuSet({
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

    await deleteNotificationsForEntity("siuSet", input.setId)

    return { type: "soft" as const }
  }

  // Hard delete: no children, remove the row entirely
  await db.delete(siuSets).where(eq(siuSets.id, input.setId))

  await deleteNotificationsForEntity("siuSet", input.setId)

  // If this was the only set, archive the round
  if (set.position === 1) {
    await db
      .update(sius)
      .set({ status: "archived", endedAt: new Date() })
      .where(eq(sius.id, set.siuId))
  }

  return { type: "hard" as const }
}

export async function listArchivedRounds() {
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

export async function getArchivedRound({
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
