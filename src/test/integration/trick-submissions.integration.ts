import { beforeEach, describe, expect, it } from "bun:test"

import { asUser, seedUser, truncatePublicTables } from "./helpers"
import { db } from "~/db"
import {
  trickElements,
  trickSubmissionElementAssignments,
  tricks,
} from "~/db/schema"
import {
  createSubmissionImpl,
  reviewSubmissionImpl,
} from "~/lib/tricks/submissions/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedTrick(overrides: Partial<typeof tricks.$inferInsert> = {}) {
  const [trick] = await db
    .insert(tricks)
    .values({
      name: overrides.name ?? "Base Trick",
      slug: overrides.slug ?? `base-trick-${Date.now()}`,
      ...overrides,
    })
    .returning()

  return trick
}

describe("trick submissions integration", () => {
  it("createSubmission creates the submission row and relationship rows", async () => {
    const submitter = await seedUser({ name: "Submitter" })
    const targetTrick = await seedTrick({
      name: "Target Trick",
      slug: "target-trick",
    })

    const submission = await createSubmissionImpl({
      ...asUser(submitter),
      data: {
        alternateNames: ["alt"],
        description: "description",
        inventedBy: "Inventor",
        inventedByUserId: null,
        name: "New Trick",
        notes: "notes",
        relationships: [
          {
            targetTrickId: targetTrick.id,
            type: "related",
          },
        ],
        slug: "new-trick",
        videoTimestamp: null,
        videoUrl: null,
        yearLanded: 2020,
      },
    })

    const relationships = await db.query.trickSubmissionRelationships.findMany()

    expect(submission).toEqual(
      expect.objectContaining({
        name: "New Trick",
        slug: "new-trick",
        status: "pending",
        submittedByUserId: submitter.id,
      }),
    )
    expect(relationships).toEqual([
      expect.objectContaining({
        submissionId: submission.id,
        targetTrickId: targetTrick.id,
        type: "related",
      }),
    ])
  })

  it("reviewSubmission approval creates the trick, copies assignments and relationships, marks the submission reviewed, and notifies the submitter", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const targetTrick = await seedTrick({
      name: "Prerequisite",
      slug: "prerequisite",
      spin: 180,
    })
    const [element] = await db
      .insert(trickElements)
      .values({
        name: "Spin",
        slug: "spin",
      })
      .returning()

    const submission = await createSubmissionImpl({
      ...asUser(submitter),
      data: {
        alternateNames: ["alt"],
        description: "description",
        inventedBy: "Inventor",
        inventedByUserId: null,
        name: "Approved Trick",
        notes: "notes",
        relationships: [
          {
            targetTrickId: targetTrick.id,
            type: "prerequisite",
          },
        ],
        slug: "approved-trick",
        videoTimestamp: null,
        videoUrl: null,
        yearLanded: 2021,
      },
    })

    await db.insert(trickSubmissionElementAssignments).values({
      elementId: element.id,
      submissionId: submission.id,
    })

    const updatedSubmission = await reviewSubmissionImpl({
      ...asUser(admin),
      data: {
        id: submission.id,
        reviewNotes: "looks good",
        status: "approved",
      },
    })

    const createdTrick = await db.query.tricks.findFirst({
      where: (table, { eq }) => eq(table.slug, submission.slug),
    })
    const assignments = await db.query.trickElementAssignments.findMany({
      where: (table, { eq }) => eq(table.trickId, createdTrick!.id),
    })
    const relationships = await db.query.trickRelationships.findMany({
      where: (table, { eq }) => eq(table.sourceTrickId, createdTrick!.id),
    })
    const rows = await db.query.notifications.findMany()

    expect(updatedSubmission).toEqual(
      expect.objectContaining({
        id: submission.id,
        reviewNotes: "looks good",
        reviewedByUserId: admin.id,
        status: "approved",
      }),
    )
    expect(updatedSubmission.reviewedAt).toBeInstanceOf(Date)
    expect(createdTrick).toEqual(
      expect.objectContaining({
        description: "description",
        name: "Approved Trick",
        notes: "notes",
        slug: "approved-trick",
      }),
    )
    expect(assignments).toEqual([
      expect.objectContaining({
        elementId: element.id,
        trickId: createdTrick!.id,
      }),
    ])
    expect(relationships).toEqual([
      expect.objectContaining({
        sourceTrickId: createdTrick!.id,
        targetTrickId: targetTrick.id,
        type: "prerequisite",
      }),
    ])
    expect(rows).toEqual([
      expect.objectContaining({
        actorId: admin.id,
        entityId: submission.id,
        entityType: "trickSubmission",
        type: "review",
        userId: submitter.id,
      }),
    ])
  })
})
