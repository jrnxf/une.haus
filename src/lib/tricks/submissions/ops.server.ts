import "@tanstack/react-start/server-only"
import { and, eq } from "drizzle-orm"

import { db } from "~/db"
import {
  type TrickSuggestionDiff,
  trickElementAssignments,
  trickElements,
  trickRelationships,
  trickSubmissionRelationships,
  trickSubmissions,
  trickSuggestions,
  tricks,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { createNotification } from "~/lib/notifications/helpers.server"

import type { CreateSubmissionArgs, ReviewSubmissionArgs } from "./schemas"

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

export async function createSubmission({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: CreateSubmissionArgs
}) {
  const { relationships, ...submissionData } = data

  // Insert submission
  const [submission] = await db
    .insert(trickSubmissions)
    .values({
      ...submissionData,
      submittedByUserId: context.user.id,
    })
    .returning()

  invariant(submission, "Failed to create submission")

  // Insert relationships
  if (relationships.length > 0) {
    await db.insert(trickSubmissionRelationships).values(
      relationships.map((rel) => ({
        submissionId: submission.id,
        targetTrickId: rel.targetTrickId,
        type: rel.type,
      })),
    )
  }

  return submission
}

export async function reviewSubmission({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: ReviewSubmissionArgs
}) {
  const { id, status, reviewNotes } = data

  // Get the submission
  const submission = await db.query.trickSubmissions.findFirst({
    where: eq(trickSubmissions.id, id),
    with: {
      elementAssignments: true,
      relationships: true,
    },
  })

  invariant(submission, "Submission not found")
  invariant(submission.status === "pending", "Submission already reviewed")

  // If approved, create the trick
  if (status === "approved") {
    // Insert trick
    const [trick] = await db
      .insert(tricks)
      .values({
        slug: submission.slug,
        name: submission.name,
        alternateNames: submission.alternateNames,
        description: submission.description,
        inventedBy: submission.inventedBy,
        yearLanded: submission.yearLanded,
        notes: submission.notes,
      })
      .returning()

    invariant(trick, "Failed to create trick from submission")

    // Copy element assignments
    if (submission.elementAssignments.length > 0) {
      await db.insert(trickElementAssignments).values(
        submission.elementAssignments.map((a) => ({
          trickId: trick.id,
          elementId: a.elementId,
        })),
      )
    }

    // Copy relationships
    if (submission.relationships.length > 0) {
      await db.insert(trickRelationships).values(
        submission.relationships.map((r) => ({
          sourceTrickId: trick.id,
          targetTrickId: r.targetTrickId,
          type: r.type,
        })),
      )
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
    .returning()

  // Notify the user who submitted
  await createNotification({
    userId: submission.submittedByUserId,
    actorId: context.user.id,
    type: "review",
    entityType: "trickSubmission",
    entityId: id,
    data: {
      actorName: context.user.name,
      actorAvatarId: context.user.avatarId,
      entityTitle: status,
      entityPreview: reviewNotes,
      trickSlug: status === "approved" ? submission.slug : undefined,
    },
  })

  return updatedSubmission
}

export async function createSuggestion({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: {
    diff: TrickSuggestionDiff
    reason?: null | string
    trickId: number
  }
}) {
  // Verify trick exists
  const trick = await db.query.tricks.findFirst({
    where: eq(tricks.id, data.trickId),
  })

  invariant(trick, "Trick not found")

  const [suggestion] = await db
    .insert(trickSuggestions)
    .values({
      trickId: data.trickId,
      diff: data.diff,
      reason: data.reason,
      submittedByUserId: context.user.id,
    })
    .returning()

  invariant(suggestion, "Failed to create suggestion")
  return suggestion
}

export async function reviewSuggestion({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: {
    id: number
    reviewNotes: string
    status: "approved" | "rejected"
  }
}) {
  const { id, status, reviewNotes } = data

  // Get the suggestion
  const suggestion = await db.query.trickSuggestions.findFirst({
    where: eq(trickSuggestions.id, id),
  })

  invariant(suggestion, "Suggestion not found")
  invariant(suggestion.status === "pending", "Suggestion already reviewed")

  // If approved, apply the diff
  if (status === "approved") {
    const diff = suggestion.diff
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    // Apply simple field changes
    if (diff.name !== undefined) updateData.name = diff.name
    if (diff.alternateNames !== undefined)
      updateData.alternateNames = diff.alternateNames
    if (diff.description !== undefined)
      updateData.description = diff.description
    if (diff.inventedBy !== undefined) updateData.inventedBy = diff.inventedBy
    if (diff.yearLanded !== undefined) updateData.yearLanded = diff.yearLanded
    if (diff.notes !== undefined) updateData.notes = diff.notes

    // Update trick
    await db
      .update(tricks)
      .set(updateData)
      .where(eq(tricks.id, suggestion.trickId))

    // Handle element changes
    if (diff.elements !== undefined) {
      // Delete all and re-insert
      await db
        .delete(trickElementAssignments)
        .where(eq(trickElementAssignments.trickId, suggestion.trickId))

      if (diff.elements.length > 0) {
        const elementResults = await db
          .select({ id: trickElements.id, slug: trickElements.slug })
          .from(trickElements)

        const elementMap = new Map(elementResults.map((e) => [e.slug, e.id]))

        const validElementIds = diff.elements
          .map((slug) => elementMap.get(slug))
          .filter((id): id is number => id !== undefined)

        if (validElementIds.length > 0) {
          await db.insert(trickElementAssignments).values(
            validElementIds.map((elementId) => ({
              trickId: suggestion.trickId,
              elementId,
            })),
          )
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
          })

          if (targetTrick) {
            await db
              .delete(trickRelationships)
              .where(
                and(
                  eq(trickRelationships.sourceTrickId, suggestion.trickId),
                  eq(trickRelationships.targetTrickId, targetTrick.id),
                ),
              )
          }
        }
      }

      // Add relationships
      if (diff.relationships.added.length > 0) {
        for (const rel of diff.relationships.added) {
          const targetTrick = await db.query.tricks.findFirst({
            where: eq(tricks.slug, rel.targetSlug),
          })

          if (targetTrick) {
            await db.insert(trickRelationships).values({
              sourceTrickId: suggestion.trickId,
              targetTrickId: targetTrick.id,
              type: rel.type as
                | "prerequisite"
                | "optional_prerequisite"
                | "related",
            })
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
    .returning()

  // Get the trick for navigation
  const trick = await db.query.tricks.findFirst({
    where: eq(tricks.id, suggestion.trickId),
    columns: { slug: true },
  })

  // Notify the user who suggested
  await createNotification({
    userId: suggestion.submittedByUserId,
    actorId: context.user.id,
    type: "review",
    entityType: "trickSuggestion",
    entityId: id,
    data: {
      actorName: context.user.name,
      actorAvatarId: context.user.avatarId,
      entityTitle: status,
      entityPreview: reviewNotes,
      trickSlug: trick?.slug,
    },
  })

  return updatedSuggestion
}
