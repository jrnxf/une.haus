import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  trickElementAssignments,
  trickElements,
  trickRelationships,
  tricks,
} from "~/db/schema"
import {
  createSuggestion,
  reviewSuggestion,
} from "~/lib/tricks/submissions/ops.server"
import { asUser, seedUser, truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedTrick(overrides: Partial<typeof tricks.$inferInsert> = {}) {
  const [trick] = await db
    .insert(tricks)
    .values({
      name: overrides.name ?? "Base Trick",
      ...overrides,
    })
    .returning()

  return trick
}

describe("trick suggestions integration", () => {
  it("createSuggestion creates the suggestion row for an existing trick", async () => {
    const submitter = await seedUser({ name: "Submitter" })
    const trick = await seedTrick({
      name: "Target Trick",
    })

    const suggestion = await createSuggestion({
      ...asUser(submitter),
      data: {
        diff: {
          description: "new description",
          elements: ["spin"],
          name: "Target Trick Updated",
        },
        reason: "clearer naming",
        trickId: trick.id,
      },
    })

    expect(suggestion).toEqual(
      expect.objectContaining({
        diff: {
          description: "new description",
          elements: ["spin"],
          name: "Target Trick Updated",
        },
        reason: "clearer naming",
        status: "pending",
        submittedByUserId: submitter.id,
        trickId: trick.id,
      }),
    )
  })

  it("createSuggestion rejects a missing trick", async () => {
    const submitter = await seedUser({ name: "Submitter" })

    await expect(
      createSuggestion({
        ...asUser(submitter),
        data: {
          diff: {
            name: "No Target",
          },
          reason: "does not exist",
          trickId: 9999,
        },
      }),
    ).rejects.toThrow("Trick not found")
  })

  it("reviewSuggestion approval applies field diffs, replaces elements, updates relationships, and notifies the suggester", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const trick = await seedTrick({
      alternateNames: ["old alt"],
      description: "old description",
      inventedBy: "Old Inventor",
      name: "Original Trick",
      notes: "old notes",
      yearLanded: 2001,
    })
    const oldTarget = await seedTrick({
      name: "Old Target",
    })
    const newTarget = await seedTrick({
      name: "New Target",
    })
    const [oldElement, newElement] = await db
      .insert(trickElements)
      .values([{ name: "Old Element" }, { name: "New Element" }])
      .returning()

    await db.insert(trickElementAssignments).values({
      elementId: oldElement.id,
      trickId: trick.id,
    })
    await db.insert(trickRelationships).values({
      sourceTrickId: trick.id,
      targetTrickId: oldTarget.id,
      type: "related",
    })

    const suggestion = await createSuggestion({
      ...asUser(submitter),
      data: {
        diff: {
          alternateNames: ["new alt"],
          description: "new description",
          elements: ["New Element", "missing-element"],
          inventedBy: "New Inventor",
          name: "Updated Trick",
          notes: "new notes",
          relationships: {
            added: [{ targetId: newTarget.id, type: "prerequisite" }],
            removed: [{ targetId: oldTarget.id, type: "related" }],
          },
          yearLanded: 2024,
        },
        reason: "better data",
        trickId: trick.id,
      },
    })

    const updatedSuggestion = await reviewSuggestion({
      ...asUser(admin),
      data: {
        id: suggestion.id,
        reviewNotes: "approved",
        status: "approved",
      },
    })

    const updatedTrick = await db.query.tricks.findFirst({
      where: (table, { eq }) => eq(table.id, trick.id),
    })
    const assignments = await db.query.trickElementAssignments.findMany({
      where: (table, { eq }) => eq(table.trickId, trick.id),
    })
    const relationships = await db.query.trickRelationships.findMany({
      where: (table, { eq }) => eq(table.sourceTrickId, trick.id),
    })
    const notifications = await db.query.notifications.findMany()

    expect(updatedSuggestion).toEqual(
      expect.objectContaining({
        id: suggestion.id,
        reviewNotes: "approved",
        reviewedByUserId: admin.id,
        status: "approved",
      }),
    )
    expect(updatedSuggestion.reviewedAt).toBeInstanceOf(Date)
    expect(updatedTrick).toEqual(
      expect.objectContaining({
        alternateNames: ["new alt"],
        description: "new description",
        inventedBy: "New Inventor",
        name: "Updated Trick",
        notes: "new notes",
        yearLanded: 2024,
      }),
    )
    expect(assignments).toEqual([
      expect.objectContaining({
        elementId: newElement.id,
        trickId: trick.id,
      }),
    ])
    expect(relationships).toEqual([
      expect.objectContaining({
        sourceTrickId: trick.id,
        targetTrickId: newTarget.id,
        type: "prerequisite",
      }),
    ])
    expect(notifications).toEqual([
      expect.objectContaining({
        actorId: admin.id,
        entityId: suggestion.id,
        entityType: "trickSuggestion",
        type: "review",
        userId: submitter.id,
      }),
    ])
  })

  it("reviewSuggestion rejects double review and leaves the original review intact", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const trick = await seedTrick({
      name: "Target Trick",
    })

    const suggestion = await createSuggestion({
      ...asUser(submitter),
      data: {
        diff: {
          notes: "reject me",
        },
        reason: "first pass",
        trickId: trick.id,
      },
    })

    await reviewSuggestion({
      ...asUser(admin),
      data: {
        id: suggestion.id,
        reviewNotes: "not this time",
        status: "rejected",
      },
    })

    await expect(
      reviewSuggestion({
        ...asUser(admin),
        data: {
          id: suggestion.id,
          reviewNotes: "second try",
          status: "approved",
        },
      }),
    ).rejects.toThrow("Suggestion already reviewed")

    const persistedSuggestion = await db.query.trickSuggestions.findFirst({
      where: (table, { eq }) => eq(table.id, suggestion.id),
    })

    expect(persistedSuggestion).toEqual(
      expect.objectContaining({
        reviewNotes: "not this time",
        reviewedByUserId: admin.id,
        status: "rejected",
      }),
    )
  })
})
