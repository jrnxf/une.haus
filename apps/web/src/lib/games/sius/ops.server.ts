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
import {
  type AuthenticatedContext,
  createChainGame,
} from "~/lib/games/chain-game.server"
import { invariant } from "~/lib/invariant"
import { createNotification } from "~/lib/notifications/helpers.server"

const ARCHIVE_VOTE_THRESHOLD = 5
const MAX_ACTIVE_ROUNDS = 3

// There should always be MAX_ACTIVE_ROUNDS rounds open for play — call this
// after any path that archives a round to spin up replacements.
async function topUpActiveRounds() {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7110)`)

    const activeRounds = await tx.query.sius.findMany({
      where: eq(sius.status, "active"),
      columns: { id: true },
    })

    const deficit = MAX_ACTIVE_ROUNDS - activeRounds.length
    if (deficit <= 0) return []

    return tx
      .insert(sius)
      .values(
        Array.from({ length: deficit }, () => ({ status: "active" as const })),
      )
      .returning()
  })
}

export async function startSiuRound() {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7110)`)

    const activeRounds = await tx.query.sius.findMany({
      where: eq(sius.status, "active"),
      columns: { id: true },
    })

    invariant(
      activeRounds.length < MAX_ACTIVE_ROUNDS,
      `Maximum of ${MAX_ACTIVE_ROUNDS} active rounds reached`,
    )

    const [round] = await tx
      .insert(sius)
      .values({ status: "active" })
      .returning()

    return { round }
  })
}

const siuChain = createChainGame({
  lockBase: 7100,
  entityType: "siuSet",
  logTag: "games.sius",
  copy: {
    continueOwnSet: "You cannot stack up your own trick",
    alreadyContinued: "This set has already been continued",
  },
  assertRoundOpen: async (exec, roundId) => {
    const round = await exec.query.sius.findFirst({
      where: eq(sius.id, roundId),
      columns: { id: true, status: true },
    })
    invariant(round, "Round not found")
    invariant(round.status === "active", "Round is not active")
  },
  findLatestSet: (exec, roundId) =>
    exec.query.siuSets.findFirst({
      where: and(eq(siuSets.siuId, roundId), isNull(siuSets.deletedAt)),
      orderBy: desc(siuSets.position),
    }),
  findChildSet: (exec, parentSetId) =>
    exec.query.siuSets.findFirst({
      where: and(
        eq(siuSets.parentSetId, parentSetId),
        isNull(siuSets.deletedAt),
      ),
      columns: { id: true },
    }),
  findSet: (exec, setId) =>
    exec.query.siuSets.findFirst({ where: eq(siuSets.id, setId) }),
  insertSet: async (tx, values) => {
    const [set] = await tx
      .insert(siuSets)
      .values({
        siuId: values.roundId,
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
    await tx.insert(siuSetMessages).values({ siuSetId: setId, userId, content })
  },
  renameSet: async (setId, userId, name) => {
    const [updated] = await db
      .update(siuSets)
      .set({ name })
      .where(and(eq(siuSets.id, setId), eq(siuSets.userId, userId)))
      .returning()
    return updated
  },
  softDeleteSet: async (setId) => {
    await db
      .update(siuSets)
      .set({ deletedAt: new Date() })
      .where(eq(siuSets.id, setId))
  },
  purgeSetEngagement: async (setId) => {
    // Message likes cascade from messages.
    await db.delete(siuSetMessages).where(eq(siuSetMessages.siuSetId, setId))
    await db.delete(siuSetLikes).where(eq(siuSetLikes.siuSetId, setId))
  },
  hardDeleteSet: async (setId) => {
    await db.delete(siuSets).where(eq(siuSets.id, setId))
  },
  onSetHardDeleted: async (set) => {
    // Removing the round's only (first) set ends the round.
    if (set.position === 1) {
      await db
        .update(sius)
        .set({ status: "archived", endedAt: new Date() })
        .where(eq(sius.id, set.siuId))

      await topUpActiveRounds()
    }
  },
})

export const createFirstSiuSet = siuChain.createFirstSet
export const addSiuSet = siuChain.continueSet
export const updateSiuSet = siuChain.updateSet
export const deleteSiuSet = siuChain.deleteSet

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

  await topUpActiveRounds()

  return { success: true }
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
