import "@tanstack/react-start/server-only"
import { and, asc, eq, gt, ilike } from "drizzle-orm"

import { type CreateTrickArgs, type UpdateTrickArgs } from "./schemas"
import { db } from "~/db"
import {
  trickElementAssignments,
  trickRelationships,
  tricks,
  trickVideos,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"

type AuthenticatedContext = {
  user: {
    id: number
  }
}

export async function listTricks({
  data: input,
}: {
  data?: {
    cursor?: number
    elementId?: number
    limit?: number
    q?: string
  }
}) {
  const limit = input?.limit ?? 50

  const tricksData = await db.query.tricks.findMany({
    where: and(
      input?.q ? ilike(tricks.name, `%${input.q}%`) : undefined,
      input?.cursor ? gt(tricks.id, input.cursor) : undefined,
    ),
    with: {
      elementAssignments: {
        with: {
          element: true,
        },
      },
      outgoingRelationships: {
        with: {
          targetTrick: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [asc(tricks.name)],
    limit,
  })

  // Filter by element if specified
  if (input?.elementId) {
    return tricksData.filter((trick) =>
      trick.elementAssignments.some((a) => a.element.id === input.elementId),
    )
  }

  return tricksData
}

export async function createTrick({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: CreateTrickArgs
}) {
  const { relationships, muxAssetIds, elementIds, ...trickData } = data

  // Insert trick
  const [trick] = await db.insert(tricks).values(trickData).returning()
  invariant(trick, "Failed to create trick")

  // Insert relationships
  if (relationships.length > 0) {
    await db.insert(trickRelationships).values(
      relationships.map((rel) => ({
        sourceTrickId: trick.id,
        targetTrickId: rel.targetTrickId,
        type: rel.type,
      })),
    )
  }

  // Insert element assignments
  if (elementIds.length > 0) {
    await db.insert(trickElementAssignments).values(
      elementIds.map((elementId) => ({
        trickId: trick.id,
        elementId,
      })),
    )
  }

  // Insert videos (auto-approved as active for admin creation)
  if (muxAssetIds.length > 0) {
    await db.insert(trickVideos).values(
      muxAssetIds.map((muxAssetId, index) => ({
        trickId: trick.id,
        muxAssetId,
        status: "active" as const,
        sortOrder: index,
        submittedByUserId: context.user.id,
        reviewedByUserId: context.user.id,
        reviewedAt: new Date(),
      })),
    )
  }

  await recomputeAllTrickComputedFields()

  return trick
}

export async function updateTrick({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: UpdateTrickArgs
}) {
  const { id, relationships, muxAssetIds, elementIds, ...trickData } = data

  // Update trick
  const [trick] = await db
    .update(tricks)
    .set({ ...trickData, updatedAt: new Date() })
    .where(eq(tricks.id, id))
    .returning()

  invariant(trick, "Trick not found")

  // Update relationships - delete all outgoing and re-insert
  await db
    .delete(trickRelationships)
    .where(eq(trickRelationships.sourceTrickId, id))

  if (relationships.length > 0) {
    await db.insert(trickRelationships).values(
      relationships.map((rel) => ({
        sourceTrickId: id,
        targetTrickId: rel.targetTrickId,
        type: rel.type,
      })),
    )
  }

  // Update element assignments - delete all and re-insert
  await db
    .delete(trickElementAssignments)
    .where(eq(trickElementAssignments.trickId, id))

  if (elementIds.length > 0) {
    await db.insert(trickElementAssignments).values(
      elementIds.map((elementId) => ({
        trickId: id,
        elementId,
      })),
    )
  }

  // Update videos - delete all active and re-insert
  await db
    .delete(trickVideos)
    .where(and(eq(trickVideos.trickId, id), eq(trickVideos.status, "active")))

  if (muxAssetIds.length > 0) {
    await db.insert(trickVideos).values(
      muxAssetIds.map((muxAssetId, index) => ({
        trickId: id,
        muxAssetId,
        status: "active" as const,
        sortOrder: index,
        submittedByUserId: context.user.id,
        reviewedByUserId: context.user.id,
        reviewedAt: new Date(),
      })),
    )
  }

  await recomputeAllTrickComputedFields()

  return trick
}

export async function deleteTrick({ data: id }: { data: number }) {
  const [trick] = await db.delete(tricks).where(eq(tricks.id, id)).returning()

  invariant(trick, "Trick not found")

  await recomputeAllTrickComputedFields()

  return trick
}

// ==================== RECOMPUTE ====================

// No-op: depth, dependents, and neighbors are now computed at read time
// in transformDbTricksToTricksData (compute.ts)
async function recomputeAllTrickComputedFields() {}
