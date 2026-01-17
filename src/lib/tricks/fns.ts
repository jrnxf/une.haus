import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { and, asc, desc, eq, ilike, notInArray, or } from "drizzle-orm";

import { db } from "~/db";
import {
  trickCategories,
  trickModifiers,
  trickRelationships,
  tricks,
} from "~/db/schema";
import { invariant } from "~/lib/invariant";
import { adminOnlyMiddleware } from "~/lib/middleware";
import {
  createCategorySchema,
  createModifierSchema,
  createTrickSchema,
  deleteCategorySchema,
  deleteModifierSchema,
  deleteTrickSchema,
  getTrickByIdSchema,
  getTrickSchema,
  listCategoriesSchema,
  listModifiersSchema,
  listTricksSchema,
  searchTricksSchema,
  updateCategorySchema,
  updateModifierSchema,
  updateTrickSchema,
} from "./schemas";

// ==================== CATEGORIES ====================

export const listCategoriesServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listCategoriesSchema))
  .handler(async () => {
    const categories = await db
      .select()
      .from(trickCategories)
      .orderBy(asc(trickCategories.sortOrder), asc(trickCategories.name));

    return categories;
  });

export const createCategoryServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createCategorySchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const [category] = await db
      .insert(trickCategories)
      .values(data)
      .returning();

    invariant(category, "Failed to create category");
    return category;
  });

export const updateCategoryServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateCategorySchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;

    const [category] = await db
      .update(trickCategories)
      .set(updateData)
      .where(eq(trickCategories.id, id))
      .returning();

    invariant(category, "Category not found");
    return category;
  });

export const deleteCategoryServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteCategorySchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: id }) => {
    const [category] = await db
      .delete(trickCategories)
      .where(eq(trickCategories.id, id))
      .returning();

    invariant(category, "Category not found");
    return category;
  });

// ==================== MODIFIERS ====================

export const listModifiersServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listModifiersSchema))
  .handler(async () => {
    const modifiers = await db
      .select()
      .from(trickModifiers)
      .orderBy(asc(trickModifiers.sortOrder), asc(trickModifiers.name));

    return modifiers;
  });

export const createModifierServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createModifierSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const [modifier] = await db.insert(trickModifiers).values(data).returning();

    invariant(modifier, "Failed to create modifier");
    return modifier;
  });

export const updateModifierServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateModifierSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;

    const [modifier] = await db
      .update(trickModifiers)
      .set(updateData)
      .where(eq(trickModifiers.id, id))
      .returning();

    invariant(modifier, "Modifier not found");
    return modifier;
  });

export const deleteModifierServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteModifierSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: id }) => {
    const [modifier] = await db
      .delete(trickModifiers)
      .where(eq(trickModifiers.id, id))
      .returning();

    invariant(modifier, "Modifier not found");
    return modifier;
  });

// ==================== TRICKS ====================

export const listTricksServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listTricksSchema))
  .handler(async ({ data: input }) => {
    const limit = input?.limit ?? 50;

    const tricksData = await db.query.tricks.findMany({
      where: and(
        input?.q
          ? or(
              ilike(tricks.name, `%${input.q}%`),
              ilike(tricks.slug, `%${input.q}%`),
            )
          : undefined,
        input?.cursor ? eq(tricks.id, input.cursor) : undefined,
      ),
      with: {
        categoryAssignments: {
          with: {
            category: true,
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
    });

    // Filter by category if specified
    if (input?.categoryId) {
      return tricksData.filter((trick) =>
        trick.categoryAssignments.some(
          (a) => a.category.id === input.categoryId,
        ),
      );
    }

    return tricksData;
  });

export const getTrickServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getTrickSchema))
  .handler(async ({ data: { slug } }) => {
    const trick = await db.query.tricks.findFirst({
      where: eq(tricks.slug, slug),
      with: {
        categoryAssignments: {
          with: {
            category: true,
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
    });

    return trick ?? null;
  });

export const getTrickByIdServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getTrickByIdSchema))
  .handler(async ({ data: { id } }) => {
    const trick = await db.query.tricks.findFirst({
      where: eq(tricks.id, id),
      with: {
        categoryAssignments: {
          with: {
            category: true,
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
    });

    return trick ?? null;
  });

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
      .limit(data.limit);

    return tricksData;
  });

export const createTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createTrickSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { relationships, ...trickData } = data;

    // Insert trick
    const [trick] = await db.insert(tricks).values(trickData).returning();
    invariant(trick, "Failed to create trick");

    // Insert relationships
    if (relationships.length > 0) {
      await db.insert(trickRelationships).values(
        relationships.map((rel) => ({
          sourceTrickId: trick.id,
          targetTrickId: rel.targetTrickId,
          type: rel.type,
        })),
      );
    }

    return trick;
  });

export const updateTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateTrickSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { id, relationships, ...trickData } = data;

    // Update trick
    const [trick] = await db
      .update(tricks)
      .set({ ...trickData, updatedAt: new Date() })
      .where(eq(tricks.id, id))
      .returning();

    invariant(trick, "Trick not found");

    // Update relationships - delete all outgoing and re-insert
    await db
      .delete(trickRelationships)
      .where(eq(trickRelationships.sourceTrickId, id));

    if (relationships.length > 0) {
      await db.insert(trickRelationships).values(
        relationships.map((rel) => ({
          sourceTrickId: id,
          targetTrickId: rel.targetTrickId,
          type: rel.type,
        })),
      );
    }

    return trick;
  });

export const deleteTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteTrickSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: id }) => {
    const [trick] = await db
      .delete(tricks)
      .where(eq(tricks.id, id))
      .returning();

    invariant(trick, "Trick not found");
    return trick;
  });

// ==================== BULK OPERATIONS ====================

export const getAllTricksForGraphServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  console.log("[getAllTricksForGraphServerFn] Fetching tricks from database...");
  const { transformDbTricksToTricksData } = await import("./compute");

  const tricksData = await db.query.tricks.findMany({
    with: {
      categoryAssignments: {
        with: {
          category: true,
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
  });

  console.log(`[getAllTricksForGraphServerFn] Found ${tricksData.length} tricks in database`);
  // Transform the DB format to TricksData for the graph
  return transformDbTricksToTricksData(tricksData);
});
