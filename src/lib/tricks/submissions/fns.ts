import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { and, asc, desc, eq, lt } from "drizzle-orm";

import { db } from "~/db";
import {
  trickElementAssignments,
  trickElements,
  trickRelationships,
  tricks,
  trickSubmissionRelationships,
  trickSubmissions,
  trickSuggestions,
  type TrickSuggestionDiff,
} from "~/db/schema";
import { invariant } from "~/lib/invariant";
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware";

import {
  createSubmissionSchema,
  createSuggestionSchema,
  getSubmissionSchema,
  getSuggestionSchema,
  listSubmissionsSchema,
  listSuggestionsSchema,
  reviewSubmissionSchema,
  reviewSuggestionSchema,
} from "./schemas";

// ==================== SUBMISSIONS ====================

export const listSubmissionsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listSubmissionsSchema))
  .handler(async ({ data: input }) => {
    const limit = input?.limit ?? 20;

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
          },
          orderBy: [desc(trickSubmissions.createdAt)],
        },
      },
      orderBy: [desc(trickSubmissions.createdAt)],
      limit,
    });

    return submissions;
  });

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
          orderBy: [asc(trickSubmissions.createdAt)],
        },
      },
    });

    return submission ?? null;
  });

export const createSubmissionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createSubmissionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { relationships, ...submissionData } = data;

    // Insert submission
    const [submission] = await db
      .insert(trickSubmissions)
      .values({
        ...submissionData,
        submittedByUserId: context.user.id,
      })
      .returning();

    invariant(submission, "Failed to create submission");

    // Insert relationships
    if (relationships.length > 0) {
      await db.insert(trickSubmissionRelationships).values(
        relationships.map((rel) => ({
          submissionId: submission.id,
          targetTrickId: rel.targetTrickId,
          type: rel.type,
        })),
      );
    }

    return submission;
  });

export const reviewSubmissionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewSubmissionSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data, context }) => {
    const { id, status, reviewNotes } = data;

    // Get the submission
    const submission = await db.query.trickSubmissions.findFirst({
      where: eq(trickSubmissions.id, id),
      with: {
        elementAssignments: true,
        relationships: true,
      },
    });

    invariant(submission, "Submission not found");
    invariant(submission.status === "pending", "Submission already reviewed");

    // If approved, create the trick
    if (status === "approved") {
      // Insert trick
      const [trick] = await db
        .insert(tricks)
        .values({
          slug: submission.slug,
          name: submission.name,
          alternateNames: submission.alternateNames,
          definition: submission.definition,
          isPrefix: submission.isPrefix,
          inventedBy: submission.inventedBy,
          yearLanded: submission.yearLanded,
          notes: submission.notes,
        })
        .returning();

      invariant(trick, "Failed to create trick from submission");

      // Copy element assignments
      if (submission.elementAssignments.length > 0) {
        await db.insert(trickElementAssignments).values(
          submission.elementAssignments.map((a) => ({
            trickId: trick.id,
            elementId: a.elementId,
          })),
        );
      }

      // Copy relationships
      if (submission.relationships.length > 0) {
        await db.insert(trickRelationships).values(
          submission.relationships.map((r) => ({
            sourceTrickId: trick.id,
            targetTrickId: r.targetTrickId,
            type: r.type,
          })),
        );
      }
    }

    // Update submission status
    const [updatedSubmission] = await db
      .update(trickSubmissions)
      .set({
        status,
        reviewedByUserId: context.user.id,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(trickSubmissions.id, id))
      .returning();

    return updatedSubmission;
  });

// ==================== SUGGESTIONS ====================

export const listSuggestionsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listSuggestionsSchema))
  .handler(async ({ data: input }) => {
    const limit = input?.limit ?? 20;

    const suggestions = await db.query.trickSuggestions.findMany({
      where: and(
        input?.status ? eq(trickSuggestions.status, input.status) : undefined,
        input?.trickId ? eq(trickSuggestions.trickId, input.trickId) : undefined,
        input?.cursor ? lt(trickSuggestions.id, input.cursor) : undefined,
      ),
      with: {
        trick: {
          columns: {
            id: true,
            slug: true,
            name: true,
          },
        },
        submittedBy: {
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
        messages: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
          },
          orderBy: [desc(trickSuggestions.createdAt)],
        },
      },
      orderBy: [desc(trickSuggestions.createdAt)],
      limit,
    });

    return suggestions;
  });

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
          orderBy: [asc(trickSuggestions.createdAt)],
        },
      },
    });

    return suggestion ?? null;
  });

export const createSuggestionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createSuggestionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    // Verify trick exists
    const trick = await db.query.tricks.findFirst({
      where: eq(tricks.id, data.trickId),
    });

    invariant(trick, "Trick not found");

    const [suggestion] = await db
      .insert(trickSuggestions)
      .values({
        trickId: data.trickId,
        diff: data.diff as TrickSuggestionDiff,
        reason: data.reason,
        submittedByUserId: context.user.id,
      })
      .returning();

    invariant(suggestion, "Failed to create suggestion");
    return suggestion;
  });

export const reviewSuggestionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewSuggestionSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data, context }) => {
    const { id, status, reviewNotes } = data;

    // Get the suggestion
    const suggestion = await db.query.trickSuggestions.findFirst({
      where: eq(trickSuggestions.id, id),
    });

    invariant(suggestion, "Suggestion not found");
    invariant(suggestion.status === "pending", "Suggestion already reviewed");

    // If approved, apply the diff
    if (status === "approved") {
      const diff = suggestion.diff;
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      // Apply simple field changes
      if (diff.name) updateData.name = diff.name.new;
      if (diff.alternateNames)
        updateData.alternateNames = diff.alternateNames.new;
      if (diff.definition) updateData.definition = diff.definition.new;
      if (diff.isPrefix !== undefined) updateData.isPrefix = diff.isPrefix.new;
      if (diff.inventedBy) updateData.inventedBy = diff.inventedBy.new;
      if (diff.yearLanded) updateData.yearLanded = diff.yearLanded.new;
      if (diff.notes) updateData.notes = diff.notes.new;

      // Update trick
      await db
        .update(tricks)
        .set(updateData)
        .where(eq(tricks.id, suggestion.trickId));

      // Handle element changes
      if (diff.elements) {
        // Delete all and re-insert
        await db
          .delete(trickElementAssignments)
          .where(eq(trickElementAssignments.trickId, suggestion.trickId));

        if (diff.elements.new.length > 0) {
          const elementResults = await db
            .select({ id: trickElements.id, slug: trickElements.slug })
            .from(trickElements);

          const elementMap = new Map(
            elementResults.map((e) => [e.slug, e.id]),
          );

          const validElementIds = diff.elements.new
            .map((slug) => elementMap.get(slug))
            .filter((id): id is number => id !== undefined);

          if (validElementIds.length > 0) {
            await db.insert(trickElementAssignments).values(
              validElementIds.map((elementId) => ({
                trickId: suggestion.trickId,
                elementId,
              })),
            );
          }
        }
      }

      // Handle relationship changes
      if (diff.relationships) {
        // Remove relationships
        if (diff.relationships.removed.length > 0) {
          for (const rel of diff.relationships.removed) {
            const targetTrick = await db.query.tricks.findFirst({
              where: eq(tricks.slug, rel.targetSlug),
            });

            if (targetTrick) {
              await db
                .delete(trickRelationships)
                .where(
                  and(
                    eq(trickRelationships.sourceTrickId, suggestion.trickId),
                    eq(trickRelationships.targetTrickId, targetTrick.id),
                  ),
                );
            }
          }
        }

        // Add relationships
        if (diff.relationships.added.length > 0) {
          for (const rel of diff.relationships.added) {
            const targetTrick = await db.query.tricks.findFirst({
              where: eq(tricks.slug, rel.targetSlug),
            });

            if (targetTrick) {
              await db.insert(trickRelationships).values({
                sourceTrickId: suggestion.trickId,
                targetTrickId: targetTrick.id,
                type: rel.type as "prerequisite" | "optional_prerequisite" | "related",
              });
            }
          }
        }
      }
    }

    // Update suggestion status
    const [updatedSuggestion] = await db
      .update(trickSuggestions)
      .set({
        status,
        reviewedByUserId: context.user.id,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(trickSuggestions.id, id))
      .returning();

    return updatedSuggestion;
  });
