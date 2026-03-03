import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, desc, eq, isNull } from "drizzle-orm"

import { backUpSetSchema, deleteSetSchema, getSetSchema } from "./schemas"
import { db } from "~/db"
import { bius, biuSetLikes, biuSetMessages, biuSets } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { authMiddleware, authOptionalMiddleware } from "~/lib/middleware"
import { notifyFollowers } from "~/lib/notifications/helpers"

// Get all chains with all sets (ordered by position desc for UI)
export const getChainsServerFn = createServerFn({ method: "GET" })
  .middleware([authOptionalMiddleware])
  .handler(async () => {
    const chains = await db.query.bius.findMany({
      orderBy: desc(bius.createdAt),
      with: {
        sets: {
          orderBy: desc(biuSets.position),
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
            video: {
              columns: { playbackId: true },
            },
            likes: {
              with: {
                user: {
                  columns: { id: true, name: true, avatarId: true },
                },
              },
            },
            messages: {
              columns: { id: true },
            },
            parentSet: {
              columns: { id: true, name: true },
              with: {
                user: {
                  columns: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    })

    return chains
  })

// Get single set with full details
export const getSetServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getSetSchema))
  .handler(async ({ data: input }) => {
    const set = await db.query.biuSets.findFirst({
      where: eq(biuSets.id, input.setId),
      with: {
        biu: {
          columns: { id: true },
        },
        user: {
          columns: { id: true, name: true, avatarId: true },
        },
        video: {
          columns: { playbackId: true },
        },
        parentSet: {
          columns: { id: true, name: true },
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
            video: {
              columns: { playbackId: true },
            },
          },
        },
        likes: {
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
          },
        },
        messages: {
          columns: { id: true, content: true, createdAt: true },
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
            likes: {
              with: {
                user: {
                  columns: { id: true, name: true, avatarId: true },
                },
              },
            },
          },
        },
      },
    })

    if (!set) return set

    // Check if this is the latest set in its chain (no non-deleted children)
    const childSet = await db.query.biuSets.findFirst({
      where: and(eq(biuSets.parentSetId, set.id), isNull(biuSets.deletedAt)),
      columns: { id: true, name: true },
    })

    return { ...set, isLatest: !childSet, childSet: childSet ?? null }
  })

// Back up a set (continue the chain)
export const backUpSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(backUpSetSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    // Get the parent set
    const parentSet = await db.query.biuSets.findFirst({
      where: eq(biuSets.id, input.parentSetId),
      with: {
        biu: true,
      },
    })

    invariant(parentSet, "Parent set not found")
    invariant(parentSet.userId !== userId, "You cannot back up your own set")

    // Ensure this is the latest set in the chain (no non-deleted child)
    const existingBackup = await db.query.biuSets.findFirst({
      where: and(
        eq(biuSets.parentSetId, input.parentSetId),
        isNull(biuSets.deletedAt),
      ),
    })

    invariant(!existingBackup, "This set has already been backed up")

    // Create the new set
    const [set] = await db
      .insert(biuSets)
      .values({
        biuId: parentSet.biuId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: parentSet.position + 1,
        parentSetId: parentSet.id,
      })
      .returning()

    // Notify followers about the new BIU set
    notifyFollowers({
      actorId: userId,
      actorName: context.user.name,
      actorAvatarId: context.user.avatarId,
      type: "new_content",
      entityType: "biuSet",
      entityId: set.id,
      entityTitle: set.name,
    }).catch(console.error)

    return set
  })

// Delete set (owner only)
export const deleteSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteSetSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    const set = await db.query.biuSets.findFirst({
      where: eq(biuSets.id, input.setId),
    })

    invariant(set, "Set not found")
    invariant(set.userId === userId, "Access denied")
    invariant(!set.deletedAt, "Set is already deleted")

    // Check if this set has non-deleted children
    const childSet = await db.query.biuSets.findFirst({
      where: and(eq(biuSets.parentSetId, set.id), isNull(biuSets.deletedAt)),
    })

    if (childSet) {
      // Soft delete: keep row for chain integrity, remove engagement data
      await db
        .update(biuSets)
        .set({ deletedAt: new Date() })
        .where(eq(biuSets.id, input.setId))

      // Hard-delete engagement data (message likes cascade from messages)
      await db
        .delete(biuSetMessages)
        .where(eq(biuSetMessages.biuSetId, input.setId))
      await db.delete(biuSetLikes).where(eq(biuSetLikes.biuSetId, input.setId))

      return { type: "soft" as const }
    }

    // Hard delete: no children, remove the row entirely
    await db.delete(biuSets).where(eq(biuSets.id, input.setId))

    return { type: "hard" as const }
  })
