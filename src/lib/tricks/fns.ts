import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, asc, desc, eq, gt, ilike, notInArray, or } from "drizzle-orm"

import { computeAllNeighbors, computeDepthsAndDependents } from "./compute"
import {
  createElementSchema,
  createModifierSchema,
  type CreateTrickArgs,
  createTrickSchema,
  deleteElementSchema,
  deleteModifierSchema,
  type UpdateTrickArgs,
  deleteTrickSchema,
  getTrickByIdSchema,
  getTrickSchema,
  listElementsSchema,
  listModifiersSchema,
  listTricksSchema,
  searchTricksSchema,
  updateElementSchema,
  updateModifierSchema,
  updateTrickSchema,
} from "./schemas"
import { type Trick } from "./types"
import { db } from "~/db"
import {
  trickCompositions,
  trickElementAssignments,
  trickElements,
  trickModifiers,
  trickRelationships,
  tricks,
  trickVideos,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { adminOnlyMiddleware } from "~/lib/middleware"

type AuthenticatedContext = {
  user: {
    id: number
  }
}

// ==================== MODIFIERS ====================

export const listModifiersServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listModifiersSchema))
  .handler(async () => {
    const modifiers = await db
      .select()
      .from(trickModifiers)
      .orderBy(asc(trickModifiers.name))

    return modifiers
  })

export const createModifierServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createModifierSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const [modifier] = await db.insert(trickModifiers).values(data).returning()

    invariant(modifier, "Failed to create modifier")
    return modifier
  })

export const updateModifierServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateModifierSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { id, ...updateData } = data

    const [modifier] = await db
      .update(trickModifiers)
      .set(updateData)
      .where(eq(trickModifiers.id, id))
      .returning()

    invariant(modifier, "Modifier not found")
    return modifier
  })

export const deleteModifierServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteModifierSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: id }) => {
    const [modifier] = await db
      .delete(trickModifiers)
      .where(eq(trickModifiers.id, id))
      .returning()

    invariant(modifier, "Modifier not found")
    return modifier
  })

// ==================== ELEMENTS ====================

export const listElementsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listElementsSchema))
  .handler(async () => {
    const elements = await db
      .select()
      .from(trickElements)
      .orderBy(asc(trickElements.name))

    return elements
  })

export const createElementServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createElementSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const [element] = await db.insert(trickElements).values(data).returning()

    invariant(element, "Failed to create element")
    return element
  })

export const updateElementServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateElementSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { id, ...updateData } = data

    const [element] = await db
      .update(trickElements)
      .set(updateData)
      .where(eq(trickElements.id, id))
      .returning()

    invariant(element, "Element not found")
    return element
  })

export const deleteElementServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteElementSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: id }) => {
    const [element] = await db
      .delete(trickElements)
      .where(eq(trickElements.id, id))
      .returning()

    invariant(element, "Element not found")
    return element
  })

// ==================== TRICKS ====================

export const listTricksServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listTricksSchema))
  .handler(listTricksImpl)

export async function listTricksImpl({
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
      input?.q
        ? or(
            ilike(tricks.name, `%${input.q}%`),
            ilike(tricks.slug, `%${input.q}%`),
          )
        : undefined,
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
              slug: true,
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

export const getTrickServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getTrickSchema))
  .handler(async ({ data: { slug } }) => {
    const trick = await db.query.tricks.findFirst({
      where: eq(tricks.slug, slug),
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
                slug: true,
                name: true,
              },
            },
          },
        },
        incomingRelationships: {
          with: {
            sourceTrick: {
              columns: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        },
        compositions: {
          with: {
            componentTrick: {
              columns: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
          orderBy: [asc(trickCompositions.position)],
        },
        likes: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
          },
        },
        messages: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
            likes: {
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    avatarId: true,
                  },
                },
              },
            },
          },
          orderBy: [desc(tricks.createdAt)],
        },
      },
    })

    return trick ?? null
  })

export const getTrickByIdServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getTrickByIdSchema))
  .handler(async ({ data: { id } }) => {
    const trick = await db.query.tricks.findFirst({
      where: eq(tricks.id, id),
      with: {
        videos: {
          where: eq(trickVideos.status, "active"),
          orderBy: [asc(trickVideos.sortOrder)],
        },
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
                slug: true,
                name: true,
              },
            },
          },
        },
        compositions: {
          with: {
            componentTrick: {
              columns: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
          orderBy: [asc(trickCompositions.position)],
        },
      },
    })

    return trick ?? null
  })

export const searchTricksServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(searchTricksSchema))
  .handler(async ({ data }) => {
    const tricksData = await db
      .select({
        id: tricks.id,
        slug: tricks.slug,
        name: tricks.name,
        isCompound: tricks.isCompound,
      })
      .from(tricks)
      .where(
        and(
          data.q
            ? or(
                ilike(tricks.name, `%${data.q}%`),
                ilike(tricks.slug, `%${data.q}%`),
              )
            : undefined,
          data.excludeIds.length > 0
            ? notInArray(tricks.id, data.excludeIds)
            : undefined,
        ),
      )
      .orderBy(asc(tricks.name))

    return tricksData
  })

export const createTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createTrickSchema))
  .middleware([adminOnlyMiddleware])
  .handler(createTrickImpl)

export async function createTrickImpl({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: CreateTrickArgs
}) {
  const { relationships, muxAssetIds, elementIds, compositions, ...trickData } =
    data

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

  // Insert compositions (for compound tricks)
  if (compositions.length > 0) {
    await db.insert(trickCompositions).values(
      compositions.map((comp) => ({
        compoundTrickId: trick.id,
        componentTrickId: comp.componentTrickId,
        position: comp.position,
        catchType: comp.catchType,
      })),
    )
  }

  await recomputeAllTrickComputedFields()

  return trick
}

export const updateTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateTrickSchema))
  .middleware([adminOnlyMiddleware])
  .handler(updateTrickImpl)

export async function updateTrickImpl({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: UpdateTrickArgs
}) {
  const {
    id,
    relationships,
    muxAssetIds,
    elementIds,
    compositions,
    ...trickData
  } = data

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

  // Update compositions - delete all and re-insert
  await db
    .delete(trickCompositions)
    .where(eq(trickCompositions.compoundTrickId, id))

  if (compositions.length > 0) {
    await db.insert(trickCompositions).values(
      compositions.map((comp) => ({
        compoundTrickId: id,
        componentTrickId: comp.componentTrickId,
        position: comp.position,
        catchType: comp.catchType,
      })),
    )
  }

  await recomputeAllTrickComputedFields()

  return trick
}

export const deleteTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteTrickSchema))
  .middleware([adminOnlyMiddleware])
  .handler(deleteTrickImpl)

export async function deleteTrickImpl({ data: id }: { data: number }) {
  const [trick] = await db.delete(tricks).where(eq(tricks.id, id)).returning()

  invariant(trick, "Trick not found")

  await recomputeAllTrickComputedFields()

  return trick
}

// ==================== RECOMPUTE ====================

async function recomputeAllTrickComputedFields() {
  const dbTricks = await db.query.tricks.findMany({
    with: {
      outgoingRelationships: {
        with: {
          targetTrick: {
            columns: { id: true, slug: true, name: true },
          },
        },
      },
      compositions: {
        with: {
          componentTrick: {
            columns: { id: true, slug: true, name: true },
          },
        },
        orderBy: (compositions, { asc }) => [asc(compositions.position)],
      },
    },
  })

  const trickObjects: Trick[] = dbTricks.map((t) => {
    const prerequisiteRel = t.outgoingRelationships.find(
      (r) => r.type === "prerequisite",
    )
    const optionalPrerequisiteRel = t.outgoingRelationships.find(
      (r) => r.type === "optional_prerequisite",
    )

    return {
      id: t.slug,
      dbId: t.id,
      name: t.name,
      alternateNames: t.alternateNames ?? [],
      elements: [],
      description: t.description ?? "",
      prerequisite: prerequisiteRel?.targetTrick.slug ?? null,
      optionalPrerequisite: optionalPrerequisiteRel?.targetTrick.slug ?? null,
      isCompound: t.isCompound,
      compositions: (t.compositions ?? [])
        .toSorted((a, b) => a.position - b.position)
        .map((c) => ({
          componentId: c.componentTrick.slug,
          componentName: c.componentTrick.name,
          position: c.position,
          catchType: c.catchType,
        })),
      notes: t.notes,
      referenceVideoUrl: null,
      referenceVideoTimestamp: null,
      modifiers: {
        flips: t.flips,
        spin: t.spin,
        wrap: t.wrap,
        twist: t.twist,
        fakie: t.fakie,
        tire: t.tire,
        switchStance: t.switchStance,
        late: t.late,
      },
      videos: [],
      neighbors: [],
      depth: 0,
      dependents: [],
    }
  })

  computeDepthsAndDependents(trickObjects)
  computeAllNeighbors(trickObjects)

  // Build a slug -> DB id map for updates
  const slugToDbId = new Map(dbTricks.map((t) => [t.slug, t.id]))

  await Promise.all(
    trickObjects.map((t) => {
      const dbId = slugToDbId.get(t.id)
      if (!dbId) return undefined
      return db
        .update(tricks)
        .set({
          depth: t.depth,
          dependentSlugs: t.dependents,
          neighborLinks: t.neighbors,
        })
        .where(eq(tricks.id, dbId))
    }),
  )
}

// ==================== BULK OPERATIONS ====================

export const getAllTricksForGraphServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { transformDbTricksToTricksData } = await import("./compute")
  const dbTricks = await db.query.tricks.findMany({
    with: {
      videos: {
        with: {
          video: {
            columns: {
              playbackId: true,
            },
          },
        },
        orderBy: (videos, { asc }) => [asc(videos.sortOrder)],
      },
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
              slug: true,
              name: true,
            },
          },
        },
      },
      compositions: {
        with: {
          componentTrick: {
            columns: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
        orderBy: (compositions, { asc }) => [asc(compositions.position)],
      },
    },
    orderBy: [asc(tricks.name)],
  })
  return transformDbTricksToTricksData(dbTricks)
})
