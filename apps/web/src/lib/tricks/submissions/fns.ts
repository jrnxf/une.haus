import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, desc, eq, lt } from "drizzle-orm"

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
import { trickSubmissions, trickSuggestions } from "~/db/schema"
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
  .inputValidator(zodValidator(createSubmissionSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createSubmission } = await loadTrickSubmissionOps()
    return createSubmission(ctx)
  })

export const reviewSubmissionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewSubmissionSchema))
  .middleware([adminOnlyMiddleware])
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
                targetTrick: { columns: { id: true } },
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

    return suggestions
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
  .inputValidator(zodValidator(createSuggestionSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createSuggestion } = await loadTrickSubmissionOps()
    return createSuggestion(ctx)
  })

export const reviewSuggestionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewSuggestionSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { reviewSuggestion } = await loadTrickSubmissionOps()
    return reviewSuggestion(ctx)
  })
