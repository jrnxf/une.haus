import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { trickElements } from "~/db/schema"
import {
  createGlossaryProposal,
  reviewGlossaryProposal,
} from "~/lib/tricks/glossary/ops.server"
import {
  asUser,
  seedUser,
  truncatePublicTables,
  waitFor,
} from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("glossary review workflow integration", () => {
  it("approving a create/element proposal inserts a trickElements row and marks the proposal approved", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })

    const proposal = await createGlossaryProposal({
      ...asUser(submitter),
      data: {
        action: "create",
        type: "element",
        name: "New Element",
        description: "an element description",
      },
    })

    const updated = await reviewGlossaryProposal({
      ...asUser(admin),
      data: { id: proposal.id, status: "approved" },
    })

    const elements = await db.query.trickElements.findMany()
    expect(elements).toEqual([
      expect.objectContaining({
        name: "New Element",
        description: "an element description",
      }),
    ])

    expect(updated).toEqual(
      expect.objectContaining({
        id: proposal.id,
        status: "approved",
        reviewedByUserId: admin.id,
      }),
    )
    expect(updated.reviewedAt).toBeInstanceOf(Date)

    // No modifier should be created for an element proposal
    const modifiers = await db.query.trickModifiers.findMany()
    expect(modifiers).toHaveLength(0)
  })

  it("approving a create/modifier proposal inserts a trickModifiers row", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })

    const proposal = await createGlossaryProposal({
      ...asUser(submitter),
      data: {
        action: "create",
        type: "modifier",
        name: "New Modifier",
        description: "a modifier description",
      },
    })

    await reviewGlossaryProposal({
      ...asUser(admin),
      data: { id: proposal.id, status: "approved" },
    })

    const modifiers = await db.query.trickModifiers.findMany()
    expect(modifiers).toEqual([
      expect.objectContaining({
        name: "New Modifier",
        description: "a modifier description",
      }),
    ])

    const elements = await db.query.trickElements.findMany()
    expect(elements).toHaveLength(0)
  })

  it("approving an edit proposal applies the diff name and leaves the description untouched", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })

    const [element] = await db
      .insert(trickElements)
      .values({ name: "Old Name", description: "original description" })
      .returning()

    const proposal = await createGlossaryProposal({
      ...asUser(submitter),
      data: {
        action: "edit",
        type: "element",
        name: "Old Name",
        targetId: element.id,
        diff: { name: "New Name" },
      },
    })

    await reviewGlossaryProposal({
      ...asUser(admin),
      data: { id: proposal.id, status: "approved" },
    })

    const updatedElement = await db.query.trickElements.findFirst({
      where: (table, { eq }) => eq(table.id, element.id),
    })
    expect(updatedElement).toEqual(
      expect.objectContaining({
        name: "New Name",
        description: "original description",
      }),
    )
  })

  it("rejecting a create proposal applies no glossary change and persists status/reviewNotes", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })

    const proposal = await createGlossaryProposal({
      ...asUser(submitter),
      data: {
        action: "create",
        type: "element",
        name: "Rejected Element",
        description: "should not be created",
      },
    })

    const updated = await reviewGlossaryProposal({
      ...asUser(admin),
      data: {
        id: proposal.id,
        status: "rejected",
        reviewNotes: "not a real element",
      },
    })

    const elements = await db.query.trickElements.findMany()
    const modifiers = await db.query.trickModifiers.findMany()
    expect(elements).toHaveLength(0)
    expect(modifiers).toHaveLength(0)

    expect(updated).toEqual(
      expect.objectContaining({
        id: proposal.id,
        status: "rejected",
        reviewNotes: "not a real element",
        reviewedByUserId: admin.id,
      }),
    )
  })

  it("reviewing an already-approved proposal throws and leaves state unchanged", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })

    const proposal = await createGlossaryProposal({
      ...asUser(submitter),
      data: {
        action: "create",
        type: "element",
        name: "Once Approved",
        description: "first review wins",
      },
    })

    await reviewGlossaryProposal({
      ...asUser(admin),
      data: { id: proposal.id, status: "approved" },
    })

    await expect(
      reviewGlossaryProposal({
        ...asUser(admin),
        data: { id: proposal.id, status: "rejected" },
      }),
    ).rejects.toThrow("Proposal already reviewed")

    // Still exactly one element, proposal still approved
    const elements = await db.query.trickElements.findMany()
    expect(elements).toHaveLength(1)

    const persisted = await db.query.glossaryProposals.findFirst({
      where: (table, { eq }) => eq(table.id, proposal.id),
    })
    expect(persisted).toEqual(
      expect.objectContaining({ id: proposal.id, status: "approved" }),
    )
  })

  it("notifies the submitter when the reviewer differs", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })

    const proposal = await createGlossaryProposal({
      ...asUser(submitter),
      data: {
        action: "create",
        type: "element",
        name: "Notify Me",
        description: "submitter gets a notification",
      },
    })

    await reviewGlossaryProposal({
      ...asUser(admin),
      data: { id: proposal.id, status: "approved" },
    })

    await waitFor(async () => {
      const notifications = await db.query.notifications.findMany()
      expect(notifications).toEqual([
        expect.objectContaining({
          actorId: admin.id,
          entityId: proposal.id,
          entityType: "glossaryProposal",
          type: "review",
          userId: submitter.id,
        }),
      ])
    })
  })

  it("does not notify when the reviewer is also the submitter", async () => {
    const author = await seedUser({ name: "Self Reviewer", type: "admin" })

    const proposal = await createGlossaryProposal({
      ...asUser(author),
      data: {
        action: "create",
        type: "element",
        name: "Self Element",
        description: "no notification expected",
      },
    })

    await reviewGlossaryProposal({
      ...asUser(author),
      data: { id: proposal.id, status: "approved" },
    })

    // Give any async notification a chance to fire, then assert none exist.
    await Bun.sleep(200)
    const notifications = await db.query.notifications.findMany()
    expect(notifications).toHaveLength(0)
  })
})
