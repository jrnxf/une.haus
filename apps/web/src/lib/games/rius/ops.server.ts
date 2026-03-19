import "@tanstack/react-start/server-only"
import { and, desc, eq, sql } from "drizzle-orm"

import { db } from "~/db"
import { riuSets, riuSubmissions, rius } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import {
  deleteNotificationsForEntity,
  notifyFollowers,
} from "~/lib/notifications/helpers.server"

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

export async function createRiuSet({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    instructions?: string
    muxAssetId: string
    name: string
  }
}) {
  const userId = context.user.id

  const upcomingRiu = await db.query.rius.findFirst({
    where: eq(rius.status, "upcoming"),
  })

  invariant(upcomingRiu, "No upcoming RIU found")

  const [riuSet] = await db
    .insert(riuSets)
    .values({
      ...input,

      riuId: upcomingRiu.id,
      userId,
    })
    .returning()

  // Notify followers about the new RIU set
  notifyFollowers({
    actorId: userId,
    actorName: context.user.name,
    actorAvatarId: context.user.avatarId,
    type: "new_content",
    entityType: "riuSet",
    entityId: riuSet.id,
  }).catch(console.error)

  return riuSet
}

export async function updateRiuSet({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    instructions?: string
    name: string
    riuSetId: number
  }
}) {
  const set = await db.query.riuSets.findFirst({
    where: eq(riuSets.id, input.riuSetId),
    columns: {
      userId: true,
    },
    with: {
      riu: {
        columns: {
          status: true,
        },
      },
    },
  })

  invariant(set, "Set not found")
  invariant(set.userId === context.user.id, "Access denied")
  invariant(set.riu.status === "upcoming", "Access denied")

  const [riuSet] = await db
    .update(riuSets)
    .set({
      instructions: input.instructions,
      name: input.name,
    })
    .where(
      and(eq(riuSets.id, input.riuSetId), eq(riuSets.userId, context.user.id)),
    )
    .returning()

  return riuSet
}

export async function deleteRiuSet({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    riuSetId: number
  }
}) {
  const userId = context.user.id

  const set = await db.query.riuSets.findFirst({
    where: eq(riuSets.id, input.riuSetId),
    columns: {
      userId: true,
    },
    with: {
      riu: {
        columns: {
          status: true,
        },
      },
    },
  })

  invariant(set, "Set not found")

  invariant(set.userId === userId, "Access denied")
  invariant(set.riu.status === "upcoming", "Access denied")

  const [deletedSet] = await db
    .delete(riuSets)
    .where(eq(riuSets.id, input.riuSetId))
    .returning()

  await deleteNotificationsForEntity("riuSet", input.riuSetId)

  return deletedSet
}

export async function deleteRiuSubmission({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    submissionId: number
  }
}) {
  const userId = context.user.id

  const submission = await db.query.riuSubmissions.findFirst({
    where: eq(riuSubmissions.id, input.submissionId),
  })

  invariant(submission, "Submission not found")

  invariant(submission.userId === userId, "Access denied")

  const [deletedSubmission] = await db
    .delete(riuSubmissions)
    .where(eq(riuSubmissions.id, input.submissionId))
    .returning()

  await deleteNotificationsForEntity("riuSubmission", input.submissionId)

  return deletedSubmission
}

export async function createRiuSubmission({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    muxAssetId: string
    riuSetId: number
  }
}) {
  const userId = context.user.id

  const [riuSet] = await db
    .select({
      id: riuSets.id,
      userId: riuSets.userId,
      riu: {
        status: rius.status,
      },
    })
    .from(riuSets)
    .innerJoin(rius, eq(riuSets.riuId, rius.id))
    .where(eq(riuSets.id, input.riuSetId))

  if (!riuSet) {
    throw new Error("No RIU set found")
  }

  if (riuSet.riu.status !== "active") {
    throw new Error("RIU set is not from an active RIU")
  }

  if (riuSet.userId === userId) {
    throw new Error("You cannot submit to your own set")
  }

  const [existing] = await db
    .select({ id: riuSubmissions.id })
    .from(riuSubmissions)
    .where(
      and(
        eq(riuSubmissions.riuSetId, riuSet.id),
        eq(riuSubmissions.userId, userId),
      ),
    )

  if (existing) {
    throw new Error("You have already submitted to this set")
  }

  const [riuSubmission] = await db
    .insert(riuSubmissions)
    .values({
      ...input,
      riuSetId: riuSet.id,
      userId,
    })
    .returning()

  return riuSubmission
}

export async function listArchivedRius() {
  // Get all archived RIUs with aggregate set/submission counts for each round.
  const archivedRius = await db
    .select({
      id: rius.id,
      createdAt: rius.createdAt,
      setsCount: sql<number>`COUNT(DISTINCT ${riuSets.id})`.as("setsCount"),
      submissionsCount: sql<number>`COUNT(${riuSubmissions.id})`.as(
        "submissionsCount",
      ),
    })
    .from(rius)
    .leftJoin(riuSets, eq(rius.id, riuSets.riuId))
    .leftJoin(riuSubmissions, eq(riuSubmissions.riuSetId, riuSets.id))
    .where(eq(rius.status, "archived"))
    .groupBy(rius.id, rius.createdAt)
    .orderBy(desc(rius.createdAt))

  return archivedRius.map((riu) => ({
    ...riu,
    setsCount: Number(riu.setsCount),
    submissionsCount: Number(riu.submissionsCount),
  }))
}

export async function rotateRius() {
  await db
    .update(rius)
    .set({ status: "archived" })
    .where(eq(rius.status, "active"))

  await db
    .update(rius)
    .set({ status: "active" })
    .where(eq(rius.status, "upcoming"))

  await db.insert(rius).values({
    status: "upcoming",
  })
}
