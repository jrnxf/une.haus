import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, desc, eq, lt } from "drizzle-orm"

import {
  createGlossaryProposalSchema,
  getGlossaryProposalSchema,
  listGlossaryProposalsSchema,
  reviewGlossaryProposalSchema,
} from "./schemas"
import { db } from "~/db"
import { glossaryProposals, trickElements, trickModifiers } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware"
import { createNotification } from "~/lib/notifications/helpers"

export const listGlossaryProposalsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listGlossaryProposalsSchema))
  .handler(async ({ data: input }) => {
    const limit = input?.limit ?? 20

    const proposals = await db.query.glossaryProposals.findMany({
      where: and(
        input?.status ? eq(glossaryProposals.status, input.status) : undefined,
        input?.cursor ? lt(glossaryProposals.id, input.cursor) : undefined,
      ),
      with: {
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
      },
      orderBy: [desc(glossaryProposals.createdAt)],
      limit,
    })

    return proposals
  })

export const getGlossaryProposalServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getGlossaryProposalSchema))
  .handler(async ({ data: { id } }) => {
    const proposal = await db.query.glossaryProposals.findFirst({
      where: eq(glossaryProposals.id, id),
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
      },
    })

    return proposal ?? null
  })

export const createGlossaryProposalServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createGlossaryProposalSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const [proposal] = await db
      .insert(glossaryProposals)
      .values({
        action: data.action,
        type: data.type,
        slug: data.slug,
        name: data.name,
        description: data.description,
        targetId: data.targetId,
        diff: data.diff,
        reason: data.reason,
        submittedByUserId: context.user.id,
      })
      .returning()

    invariant(proposal, "Failed to create glossary proposal")
    return proposal
  })

export const reviewGlossaryProposalServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewGlossaryProposalSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data, context }) => {
    const { id, status, reviewNotes } = data

    const proposal = await db.query.glossaryProposals.findFirst({
      where: eq(glossaryProposals.id, id),
    })

    invariant(proposal, "Proposal not found")
    invariant(proposal.status === "pending", "Proposal already reviewed")

    // If approved, apply the change
    if (status === "approved") {
      if (proposal.action === "create") {
        if (proposal.type === "element") {
          await db.insert(trickElements).values({
            slug: proposal.slug,
            name: proposal.name,
            description: proposal.description,
          })
        } else {
          await db.insert(trickModifiers).values({
            slug: proposal.slug,
            name: proposal.name,
            description: proposal.description,
          })
        }
      } else if (proposal.action === "edit" && proposal.targetId) {
        const updateData: Record<string, unknown> = {}
        const diff = proposal.diff

        if (diff?.name !== undefined) updateData.name = diff.name
        if (diff?.description !== undefined)
          updateData.description = diff.description

        if (Object.keys(updateData).length > 0) {
          if (proposal.type === "element") {
            await db
              .update(trickElements)
              .set(updateData)
              .where(eq(trickElements.id, proposal.targetId))
          } else {
            await db
              .update(trickModifiers)
              .set(updateData)
              .where(eq(trickModifiers.id, proposal.targetId))
          }
        }
      }
    }

    // Update proposal status
    const [updatedProposal] = await db
      .update(glossaryProposals)
      .set({
        status,
        reviewedByUserId: context.user.id,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(glossaryProposals.id, id))
      .returning()

    // Notify submitter
    if (proposal.submittedByUserId !== context.user.id) {
      createNotification({
        userId: proposal.submittedByUserId,
        actorId: context.user.id,
        type: "review",
        entityType: "glossaryProposal",
        entityId: id,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityTitle: status,
          entityPreview: reviewNotes,
        },
      }).catch(console.error)
    }

    return updatedProposal
  })
