import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"

import { db } from "~/db"
import { type NotificationEntityType } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { logRejection } from "~/lib/logger"
import {
  createNotification,
  deleteNotificationsForEntity,
  notifyFollowers,
} from "~/lib/notifications/helpers.server"

export type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

// Both chain games play out as a linked list of sets: the first set opens the
// round at position 1, and every later set continues the previous one at
// position + 1. Everything below is the shared policy for that shape —
// advisory locking, the existence/ownership invariants, the position math, and
// the follower/owner notifications. A per-game descriptor supplies the parts
// that genuinely differ: the tables (via typed data-access closures), the
// advisory-lock base, the engagement entity type, and the copy strings.

// A transaction handle from db.transaction, used to serialize the read-modify-
// write of a chain continuation under an advisory lock.
type ChainTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

// Anything that exposes the relational query API — satisfied by both `db` and a
// transaction handle, so reads can run inside or outside a transaction.
type QueryExecutor = { query: typeof db.query }

// The minimal shape the shared policy needs from a set row. Concrete games
// return their full Drizzle row, which widens TSet to the real table type.
type ChainSet = {
  id: number
  userId: number
  name: string
  position: number
  parentSetId: number | null
  deletedAt: Date | null
}

type NewChainSet = {
  roundId: number
  userId: number
  muxAssetId: string
  name: string
  position: number
  parentSetId: number | null
}

export type ChainGameDescriptor<TSet extends ChainSet> = {
  // Base advisory-lock id. Creating the first set locks on base + 1, continuing
  // the chain locks on base + 2 — keeping the two paths on distinct ids while
  // staying deterministic per game.
  lockBase: number
  // Engagement + notification entity type, e.g. "biuSet" / "siuSet".
  entityType: NotificationEntityType
  // Prefix for logRejection tags on fire-and-forget notifications, e.g.
  // "games.bius" produces "games.bius.notify".
  logTag: string
  // Invariant copy that differs between games.
  copy: {
    continueOwnSet: string
    alreadyContinued: string
  }

  // Throw if the round cannot accept a new set (missing round, or — for games
  // with a lifecycle — a round that is no longer active).
  assertRoundOpen: (exec: QueryExecutor, roundId: number) => Promise<void>

  // Newest non-deleted set in the round (highest position), or undefined.
  findLatestSet: (
    exec: QueryExecutor,
    roundId: number,
  ) => Promise<TSet | undefined>
  // A non-deleted set continuing the given set, if one exists.
  findChildSet: (
    exec: QueryExecutor,
    parentSetId: number,
  ) => Promise<{ id: number } | undefined>
  // A set by id, or undefined.
  findSet: (exec: QueryExecutor, setId: number) => Promise<TSet | undefined>

  // Insert a set and return the full row.
  insertSet: (tx: ChainTx, values: NewChainSet) => Promise<TSet>
  // Insert an instructions message on a freshly created set.
  insertInstructions: (
    tx: ChainTx,
    setId: number,
    userId: number,
    content: string,
  ) => Promise<void>

  // Rename a set the caller owns, returning the updated row.
  renameSet: (
    setId: number,
    userId: number,
    name: string,
  ) => Promise<TSet | undefined>
  // Flag a set deleted while keeping its row for chain integrity.
  softDeleteSet: (setId: number) => Promise<void>
  // Hard-delete a set's engagement rows (messages + likes).
  purgeSetEngagement: (setId: number) => Promise<void>
  // Remove a set row entirely.
  hardDeleteSet: (setId: number) => Promise<void>

  // Optional hook run after a leaf set is hard-deleted. SIU uses it to archive
  // the round when the deleted set was the round's only (first) set.
  onSetHardDeleted?: (set: TSet) => Promise<void>
}

type SetInput = {
  instructions?: string
  muxAssetId: string
  name: string
  roundId: number
}

export function createChainGame<TSet extends ChainSet>(
  descriptor: ChainGameDescriptor<TSet>,
) {
  async function createFirstSet({
    data: input,
    context,
  }: {
    context: AuthenticatedContext
    data: SetInput
  }) {
    const userId = context.user.id

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(${sql.raw(String(descriptor.lockBase + 1))}, ${input.roundId})`,
      )

      await descriptor.assertRoundOpen(tx, input.roundId)

      const existingSet = await descriptor.findLatestSet(tx, input.roundId)
      invariant(!existingSet, "Round already has a first set")

      const set = await descriptor.insertSet(tx, {
        roundId: input.roundId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: 1,
        parentSetId: null,
      })

      const instructions = input.instructions?.trim()
      if (instructions) {
        await descriptor.insertInstructions(tx, set.id, userId, instructions)
      }

      return set
    })
  }

  async function continueSet({
    data: input,
    context,
  }: {
    context: AuthenticatedContext
    data: SetInput
  }) {
    const userId = context.user.id

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(${sql.raw(String(descriptor.lockBase + 2))}, ${input.roundId})`,
      )

      await descriptor.assertRoundOpen(tx, input.roundId)

      const parentSet = await descriptor.findLatestSet(tx, input.roundId)

      invariant(parentSet, "Round has no sets yet")
      invariant(parentSet.userId !== userId, descriptor.copy.continueOwnSet)

      // Ensure this latest set is still uncontinued.
      const existingChild = await descriptor.findChildSet(tx, parentSet.id)
      invariant(!existingChild, descriptor.copy.alreadyContinued)

      const set = await descriptor.insertSet(tx, {
        roundId: input.roundId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: parentSet.position + 1,
        parentSetId: parentSet.id,
      })

      const instructions = input.instructions?.trim()
      if (instructions) {
        await descriptor.insertInstructions(tx, set.id, userId, instructions)
      }

      // Notify followers about the new set.
      notifyFollowers({
        actorId: userId,
        actorName: context.user.name,
        actorAvatarId: context.user.avatarId,
        type: "new_content",
        entityType: descriptor.entityType,
        entityId: set.id,
        entityTitle: set.name,
      }).catch(logRejection(`${descriptor.logTag}.notify`))

      // Notify the owner of the set that was just continued.
      createNotification({
        userId: parentSet.userId,
        actorId: userId,
        type: "game_activity",
        entityType: descriptor.entityType,
        entityId: set.id,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityTitle: set.name,
        },
      }).catch(logRejection(`${descriptor.logTag}.notify`))

      return set
    })
  }

  async function updateSet({
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

    const set = await descriptor.findSet(db, input.setId)

    invariant(set, "Set not found")
    invariant(set.userId === userId, "Access denied")

    return descriptor.renameSet(input.setId, userId, input.name)
  }

  async function deleteSet({
    data: input,
    context,
  }: {
    context: AuthenticatedContext
    data: {
      setId: number
    }
  }) {
    const userId = context.user.id

    const set = await descriptor.findSet(db, input.setId)

    invariant(set, "Set not found")
    invariant(set.userId === userId, "Access denied")
    invariant(!set.deletedAt, "Set is already deleted")

    const childSet = await descriptor.findChildSet(db, set.id)

    if (childSet) {
      // Soft delete: keep the row for chain integrity, remove engagement data.
      await descriptor.softDeleteSet(input.setId)
      await descriptor.purgeSetEngagement(input.setId)
      await deleteNotificationsForEntity(descriptor.entityType, input.setId)

      return { type: "soft" as const }
    }

    // Hard delete: no children, remove the row entirely.
    await descriptor.hardDeleteSet(input.setId)
    await deleteNotificationsForEntity(descriptor.entityType, input.setId)

    await descriptor.onSetHardDeleted?.(set)

    return { type: "hard" as const }
  }

  return { createFirstSet, continueSet, updateSet, deleteSet }
}
