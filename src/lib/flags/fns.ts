import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, desc, eq, isNull } from "drizzle-orm"

import { flagContentSchema, resolveFlagSchema } from "./schemas"
import { db } from "~/db"
import {
  type FlagEntityType,
  type NotificationEntityType,
  flags,
  users,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware"
import { createNotification } from "~/lib/notifications/helpers"

/**
 * Maps flag entity types to notification entity types.
 * Message flags use the parent entity type for notification URL routing.
 */
const FLAG_TO_NOTIFICATION_ENTITY: Record<
  FlagEntityType,
  NotificationEntityType
> = {
  post: "post",
  biuSet: "biuSet",
  siuSet: "siuSet",
  riuSet: "riuSet",
  riuSubmission: "riuSubmission",
  postMessage: "post",
  biuSetMessage: "biuSet",
  siuSetMessage: "siuSet",
  riuSetMessage: "riuSet",
  riuSubmissionMessage: "riuSubmission",
  utvVideoMessage: "utvVideo",
  chatMessage: "chat",
}

export const flagContentServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(flagContentSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    // Check for existing unresolved flag on same entity by same user
    const existing = await db.query.flags.findFirst({
      where: and(
        eq(flags.entityType, input.entityType),
        eq(flags.entityId, input.entityId),
        eq(flags.userId, userId),
        isNull(flags.resolvedAt),
      ),
    })

    invariant(!existing, "You have already flagged this content")

    const [flag] = await db
      .insert(flags)
      .values({
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        userId,
        parentEntityId: input.parentEntityId,
      })
      .returning()

    // Determine notification entity type and ID
    const isMessage = input.entityType.endsWith("Message")
    const notifEntityType = FLAG_TO_NOTIFICATION_ENTITY[input.entityType]
    const notifEntityId = isMessage
      ? (input.parentEntityId ?? input.entityId)
      : input.entityId

    // Notify all admins
    const admins = await db.query.users.findMany({
      where: eq(users.type, "admin"),
      columns: { id: true },
    })

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        actorId: userId,
        type: "flag",
        entityType: notifEntityType,
        entityId: notifEntityId,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityPreview: input.reason,
        },
      })
    }

    return flag
  })

export const resolveFlagServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(resolveFlagSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: input, context }) => {
    const flag = await db.query.flags.findFirst({
      where: eq(flags.id, input.flagId),
    })

    invariant(flag, "Flag not found")
    invariant(!flag.resolvedAt, "Flag is already resolved")

    const [updated] = await db
      .update(flags)
      .set({
        resolvedAt: new Date(),
        resolvedByUserId: context.user.id,
        resolution: input.resolution,
      })
      .where(eq(flags.id, input.flagId))
      .returning()

    // Determine notification entity type and ID
    const isMessage = flag.entityType.endsWith("Message")
    const notifEntityType = FLAG_TO_NOTIFICATION_ENTITY[flag.entityType]
    const notifEntityId = isMessage
      ? (flag.parentEntityId ?? flag.entityId)
      : flag.entityId

    // Notify the flagger
    await createNotification({
      userId: flag.userId,
      actorId: context.user.id,
      type: "review",
      entityType: notifEntityType,
      entityId: notifEntityId,
      data: {
        actorName: context.user.name,
        actorAvatarId: context.user.avatarId,
        entityTitle:
          input.resolution === "dismissed"
            ? "dismissed your flag"
            : "acted on your flag",
      },
    })

    return updated
  })

export const listFlagsServerFn = createServerFn({ method: "GET" })
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    const unresolvedFlags = await db.query.flags.findMany({
      where: isNull(flags.resolvedAt),
      orderBy: desc(flags.createdAt),
      with: {
        user: { columns: { id: true, name: true, avatarId: true } },
      },
    })

    return unresolvedFlags
  })
