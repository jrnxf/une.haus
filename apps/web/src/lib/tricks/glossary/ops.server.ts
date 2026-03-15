import "@tanstack/react-start/server-only"
import { and, desc, eq, lt } from "drizzle-orm"

import { db } from "~/db"
import { glossaryProposals, trickElements, trickModifiers } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { createNotification } from "~/lib/notifications/helpers.server"

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

export async function listGlossaryProposals({
  data: input,
}: {
  data?: {
    cursor?: number
    limit?: number
    status?: "approved" | "pending" | "rejected"
  }
}) {
  const limit = input?.limit ?? 20

  return db.query.glossaryProposals.findMany({
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
}

export async function getGlossaryProposal({
  data: { id },
}: {
  data: {
    id: number
  }
}) {
  return (
    (await db.query.glossaryProposals.findFirst({
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
    })) ?? null
  )
}

export async function createGlossaryProposal({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: {
    action: "create" | "edit"
    description?: null | string
    diff?: Record<string, unknown> | null
    name: string
    reason?: null | string
    targetId?: null | number
    type: "element" | "modifier"
  }
}) {
  const [proposal] = await db
    .insert(glossaryProposals)
    .values({
      action: data.action,
      type: data.type,
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
}

export async function reviewGlossaryProposal({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: {
    id: number
    reviewNotes?: null | string
    status: "approved" | "rejected"
  }
}) {
  const { id, status, reviewNotes } = data

  const proposal = await db.query.glossaryProposals.findFirst({
    where: eq(glossaryProposals.id, id),
  })

  invariant(proposal, "Proposal not found")
  invariant(proposal.status === "pending", "Proposal already reviewed")

  if (status === "approved") {
    if (proposal.action === "create") {
      if (proposal.type === "element") {
        await db.insert(trickElements).values({
          name: proposal.name,
          description: proposal.description,
        })
      } else {
        await db.insert(trickModifiers).values({
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
        entityPreview: reviewNotes ?? undefined,
      },
    }).catch(console.error)
  }

  return updatedProposal
}
