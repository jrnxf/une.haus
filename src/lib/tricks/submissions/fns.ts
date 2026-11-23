import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, desc, eq, inArray, lt } from "drizzle-orm"

import {
  createSubmissionSchema,
  createSuggestionSchema,
  getSubmissionSchema,
  getSuggestionSchema,
  listSubmissionsSchema,
  listSuggestionsSchema,
  reviewSubmissionSchema,
  reviewSuggestionSchema,
} from "./schemas"
import { db } from "~/db"
import { tricks, trickSubmissions, trickSuggestions } from "~/db/schema"
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware"

const loadTrickSubmissionOps = createServerOnlyFn(() => import("./ops.server"))

// ==================== SUBMISSIONS ====================

export const listSubmissionsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listSubmissionsSchema))
  .handler(async ({ data: input }) => {
    const limit = input?.limit ?? 20

    const submissions = await db.query.trickSubmissions.findMany({
      where: and(
        input?.status ? eq(trickSubmissions.status, input.status) : undefined,
        input?.cursor ? lt(trickSubmissions.id, input.cursor) : undefined,
      ),
      with: {
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
        elementAssignments: {
          with: {
            element: true,
          },
        },
        relationships: {
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
      orderBy: [desc(trickSubmissions.createdAt)],
      limit,
    })

    return submissions
  })

export const getSubmissionServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getSubmissionSchema))
  .handler(async ({ data: { id } }) => {
    const submission = await db.query.trickSubmissions.findFirst({
      where: eq(trickSubmissions.id, id),
      with: {
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
        reviewedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
        elementAssignments: {
          with: {
            element: true,
          },
        },
        relationships: {
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
    })

    return submission ?? null
  })

export const createSubmissionServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(createSubmissionSchema))
  .handler(async (ctx) => {
    const { createSubmission } = await loadTrickSubmissionOps()
    return createSubmission(ctx)
  })

export const reviewSubmissionServerFn = createServerFn({
  method: "POST",
})
  .middleware([adminOnlyMiddleware])
  .inputValidator(zodValidator(reviewSubmissionSchema))
  .handler(async (ctx) => {
    const { reviewSubmission } = await loadTrickSubmissionOps()
    return reviewSubmission(ctx)
  })

// ==================== SUGGESTIONS ====================

export const listSuggestionsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listSuggestionsSchema))
  .handler(async ({ data: input }) => {
    const limit = input?.limit ?? 20

    const suggestions = await db.query.trickSuggestions.findMany({
      where: and(
        input?.status ? eq(trickSuggestions.status, input.status) : undefined,
        input?.trickId
          ? eq(trickSuggestions.trickId, input.trickId)
          : undefined,
        input?.cursor ? lt(trickSuggestions.id, input.cursor) : undefined,
      ),
      with: {
        trick: {
          columns: {
            id: true,
            name: true,
            alternateNames: true,
            description: true,
            inventedBy: true,
            yearLanded: true,
            notes: true,
          },
          with: {
            elementAssignments: {
              with: {
                element: { columns: { name: true } },
              },
            },
            outgoingRelationships: {
              columns: { type: true },
              with: {
                targetTrick: { columns: { id: true, name: true } },
              },
            },
          },
        },
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
      },
      orderBy: [desc(trickSuggestions.createdAt)],
      limit,
    })

    // A diff names an added relationship by trick id only. Send the names
    // too, so a reviewer reads a trick name and not a number.
    const addedTargetIds = [
      ...new Set(
        suggestions.flatMap((s) =>
          (s.diff.relationships?.added ?? []).map((r) => r.targetId),
        ),
      ),
    ]
    const addedTargets =
      addedTargetIds.length > 0
        ? await db.query.tricks.findMany({
            where: inArray(tricks.id, addedTargetIds),
            columns: { id: true, name: true },
          })
        : []
    const nameById = new Map(addedTargets.map((t) => [t.id, t.name]))

    return suggestions.map((s) => ({
      ...s,
      addedRelationshipTargets: (s.diff.relationships?.added ?? []).map(
        (r) => ({
          id: r.targetId,
          type: r.type,
          name: nameById.get(r.targetId) ?? null,
        }),
      ),
    }))
  })

export const getSuggestionServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getSuggestionSchema))
  .handler(async ({ data: { id } }) => {
    const suggestion = await db.query.trickSuggestions.findFirst({
      where: eq(trickSuggestions.id, id),
      with: {
        trick: {
          with: {
            elementAssignments: {
              with: {
                element: true,
              },
            },
          },
        },
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
        reviewedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
      },
    })

    return suggestion ?? null
  })

export const createSuggestionServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(createSuggestionSchema))
  .handler(async (ctx) => {
    const { createSuggestion } = await loadTrickSubmissionOps()
    return createSuggestion(ctx)
  })

export const reviewSuggestionServerFn = createServerFn({
  method: "POST",
})
  .middleware([adminOnlyMiddleware])
  .inputValidator(zodValidator(reviewSuggestionSchema))
  .handler(async (ctx) => {
    const { reviewSuggestion } = await loadTrickSubmissionOps()
    return reviewSuggestion(ctx)
  })
