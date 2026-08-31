import "@tanstack/react-start/server-only"
import { db } from "~/db"
import { type NotificationEntityType } from "~/db/schema"
import { background } from "~/lib/execution-context"
import { invariant } from "~/lib/invariant"
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
// position + 1. Everything below is the shared policy for that shape — the
// existence/ownership invariants, the position math, and the follower/owner
// notifications. A per-game descriptor supplies the parts that genuinely
// differ: the tables (via typed data-access closures), the engagement entity
// type, and the copy strings.
//
// Concurrency: D1 has no interactive transactions, so the read-check-insert
// flow is optimistic. The database is the backstop — each game's sets table
// carries two partial unique indexes ("one live child per set",
// "one live set per round position"), so a lost race surfaces as a UNIQUE
// violation on insert, which we translate back into the game's invariant copy.

// Anything that exposes the relational query API — satisfied by `db`.
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
  // Engagement + notification entity type, e.g. "biuSet" / "siuSet".
  entityType: NotificationEntityType
  // Prefix for background-task tags on fire-and-forget notifications, e.g.
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
  insertSet: (values: NewChainSet) => Promise<TSet>
  // Insert an instructions message on a freshly created set.
  insertInstructions: (
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

// A UNIQUE violation from the sets table's partial indexes means we lost an
// insert race that the pre-insert reads didn't see. drizzle wraps the driver
// error, so scan the cause chain.
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  while (current instanceof Error) {
    if (/UNIQUE constraint failed/i.test(current.message)) return true
    current = current.cause
  }
  return false
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

    await descriptor.assertRoundOpen(db, input.roundId)

    const existingSet = await descriptor.findLatestSet(db, input.roundId)
    invariant(!existingSet, "Round already has a first set")

    let set: TSet
    try {
      set = await descriptor.insertSet({
        roundId: input.roundId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: 1,
        parentSetId: null,
      })
    } catch (error) {
      // Lost a race with a concurrent first set — the round_position index
      // rejected the duplicate position 1.
      invariant(!isUniqueViolation(error), "Round already has a first set")
      throw error
    }

    const instructions = input.instructions?.trim()
    if (instructions) {
      await descriptor.insertInstructions(set.id, userId, instructions)
    }

    return set
  }

  async function continueSet({
    data: input,
    context,
  }: {
    context: AuthenticatedContext
    data: SetInput
  }) {
    const userId = context.user.id

    await descriptor.assertRoundOpen(db, input.roundId)

    const parentSet = await descriptor.findLatestSet(db, input.roundId)

    invariant(parentSet, "Round has no sets yet")
    invariant(parentSet.userId !== userId, descriptor.copy.continueOwnSet)

    // Ensure this latest set is still uncontinued.
    const existingChild = await descriptor.findChildSet(db, parentSet.id)
    invariant(!existingChild, descriptor.copy.alreadyContinued)

    let set: TSet
    try {
      set = await descriptor.insertSet({
        roundId: input.roundId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: parentSet.position + 1,
        parentSetId: parentSet.id,
      })
    } catch (error) {
      // Lost a race with a concurrent continuation — the one_child or
      // round_position index rejected the duplicate.
      invariant(!isUniqueViolation(error), descriptor.copy.alreadyContinued)
      throw error
    }

    const instructions = input.instructions?.trim()
    if (instructions) {
      await descriptor.insertInstructions(set.id, userId, instructions)
    }

    // Notify followers about the new set.
    background(
      notifyFollowers({
        actorId: userId,
        actorName: context.user.name,
        actorAvatarId: context.user.avatarId,
        type: "new_content",
        entityType: descriptor.entityType,
        entityId: set.id,
        entityTitle: set.name,
      }),
      `${descriptor.logTag}.notify`,
    )

    // Notify the owner of the set that was just continued.
    background(
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
      }),
      `${descriptor.logTag}.notify`,
    )

    return set
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
