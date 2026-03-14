import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, asc, desc, eq, ilike, notInArray, or } from "drizzle-orm"

import {
  createElementSchema,
  createModifierSchema,
  createTrickSchema,
  deleteElementSchema,
  deleteModifierSchema,
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
import { db } from "~/db"
import { trickElements, trickModifiers, tricks, trickVideos } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { adminOnlyMiddleware } from "~/lib/middleware"
import { type DbTrickWithRelations } from "~/lib/tricks/compute"

const loadTrickOps = createServerOnlyFn(() => import("./ops.server"))

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
  .handler(async (ctx) => {
    const { listTricks } = await loadTrickOps()
    return listTricks(ctx)
  })

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
  .handler(async (ctx) => {
    const { createTrick } = await loadTrickOps()
    return createTrick(ctx)
  })

export const updateTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateTrickSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { updateTrick } = await loadTrickOps()
    return updateTrick(ctx)
  })

export const deleteTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteTrickSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { deleteTrick } = await loadTrickOps()
    return deleteTrick(ctx)
  })

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
    },
    orderBy: [asc(tricks.name)],
  })
  return transformDbTricksToTricksData(
    dbTricks as unknown as DbTrickWithRelations[],
  )
})
