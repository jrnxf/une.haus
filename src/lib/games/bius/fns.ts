import { createServerFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "~/db";
import { biuChains, biuSets } from "~/db/schema";
import { invariant } from "~/lib/invariant";
import {
  adminOnlyMiddleware,
  authMiddleware,
  authOptionalMiddleware,
} from "~/lib/middleware";
import { notifyFollowers } from "~/lib/notifications/helpers";

import {
  backUpSetSchema,
  deleteSetSchema,
  flagSetSchema,
  getSetSchema,
  listArchivedChainsSchema,
  resolveFlagSchema,
  startChainSchema,
} from "./schemas";

// Get active chain with all sets (ordered by position desc for UI)
export const getActiveChainServerFn = createServerFn({ method: "GET" })
  .middleware([authOptionalMiddleware])
  .handler(async () => {
    const activeChain = await db.query.biuChains.findFirst({
      where: eq(biuChains.status, "active"),
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
    });

    return activeChain ?? null;
  });

// Get single set with full details
export const getSetServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getSetSchema))
  .handler(async ({ data: input }) => {
    const set = await db.query.biuSets.findFirst({
      where: eq(biuSets.id, input.setId),
      with: {
        chain: {
          columns: { id: true, status: true },
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
    });

    return set;
  });

// Start a new chain (admin only)
export const startChainServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(startChainSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    // Check if there's already an active chain
    const existingActiveChain = await db.query.biuChains.findFirst({
      where: eq(biuChains.status, "active"),
    });

    invariant(!existingActiveChain, "An active chain already exists");

    // Create new chain
    const [chain] = await db
      .insert(biuChains)
      .values({ status: "active" })
      .returning();

    // Create first set
    const [set] = await db
      .insert(biuSets)
      .values({
        chainId: chain.id,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: 1,
        parentSetId: null,
      })
      .returning();

    return { chain, set };
  });

// Back up a set (continue the chain)
export const backUpSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(backUpSetSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    // Get the parent set
    const parentSet = await db.query.biuSets.findFirst({
      where: eq(biuSets.id, input.parentSetId),
      with: {
        chain: true,
      },
    });

    invariant(parentSet, "Parent set not found");
    invariant(parentSet.chain.status === "active", "Chain is not active");
    invariant(parentSet.userId !== userId, "You cannot back up your own set");
    invariant(
      !parentSet.flaggedAt || parentSet.flagResolvedAt,
      "Parent set is flagged and pending review",
    );

    // Ensure this is the latest set in the chain (no one else has backed it up)
    const existingBackup = await db.query.biuSets.findFirst({
      where: eq(biuSets.parentSetId, input.parentSetId),
    });

    invariant(!existingBackup, "This set has already been backed up");

    // Create the new set
    const [set] = await db
      .insert(biuSets)
      .values({
        chainId: parentSet.chainId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: parentSet.position + 1,
        parentSetId: parentSet.id,
      })
      .returning();

    // Notify followers about the new BIU set
    notifyFollowers({
      actorId: userId,
      actorName: context.user.name,
      actorAvatarId: context.user.avatarId,
      type: "new_content",
      entityType: "biuSet",
      entityId: set.id,
      entityTitle: set.name,
    }).catch(console.error);

    return set;
  });

// Flag a set
export const flagSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(flagSetSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const set = await db.query.biuSets.findFirst({
      where: eq(biuSets.id, input.setId),
    });

    invariant(set, "Set not found");
    invariant(!set.flaggedAt, "Set is already flagged");

    // Update set with flag
    const [updatedSet] = await db
      .update(biuSets)
      .set({
        flaggedAt: new Date(),
        flaggedByUserId: userId,
        flagReason: input.reason,
      })
      .where(eq(biuSets.id, input.setId))
      .returning();

    // Update chain status to flagged
    await db
      .update(biuChains)
      .set({ status: "flagged" })
      .where(eq(biuChains.id, set.chainId));

    // TODO: Send email to admin for review

    return updatedSet;
  });

// Resolve flag (admin only)
export const resolveFlagServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(resolveFlagSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: input }) => {
    const set = await db.query.biuSets.findFirst({
      where: eq(biuSets.id, input.setId),
      with: { chain: true },
    });

    invariant(set, "Set not found");
    invariant(set.flaggedAt, "Set is not flagged");

    if (input.approved) {
      // Flag was invalid - restore the chain
      await db
        .update(biuSets)
        .set({ flagResolvedAt: new Date() })
        .where(eq(biuSets.id, input.setId));

      await db
        .update(biuChains)
        .set({ status: "active" })
        .where(eq(biuChains.id, set.chainId));
    } else {
      // Flag was valid - delete this set and all subsequent sets
      await db
        .delete(biuSets)
        .where(
          and(
            eq(biuSets.chainId, set.chainId),
            gte(biuSets.position, set.position),
          ),
        );

      // Keep chain active so someone else can continue from parent
      // Or mark as completed if this was the first set
      if (set.position === 1) {
        await db
          .update(biuChains)
          .set({ status: "completed", endedAt: new Date() })
          .where(eq(biuChains.id, set.chainId));
      } else {
        await db
          .update(biuChains)
          .set({ status: "active" })
          .where(eq(biuChains.id, set.chainId));
      }
    }

    return { success: true };
  });

// Delete set (owner only, only if it's the latest)
export const deleteSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteSetSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const set = await db.query.biuSets.findFirst({
      where: eq(biuSets.id, input.setId),
    });

    invariant(set, "Set not found");
    invariant(set.userId === userId, "Access denied");

    // Check if this is the latest set (no children)
    const childSet = await db.query.biuSets.findFirst({
      where: eq(biuSets.parentSetId, set.id),
    });

    invariant(!childSet, "Cannot delete a set that has been backed up");

    // Delete the set
    const [deleted] = await db
      .delete(biuSets)
      .where(eq(biuSets.id, input.setId))
      .returning();

    // If this was the only set, end the chain
    if (set.position === 1) {
      await db
        .update(biuChains)
        .set({ status: "completed", endedAt: new Date() })
        .where(eq(biuChains.id, set.chainId));
    }

    return deleted;
  });

// List archived/completed chains
export const listArchivedChainsServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(listArchivedChainsSchema))
  .handler(async ({ data: input }) => {
    const chains = await db.query.biuChains.findMany({
      where: eq(biuChains.status, "completed"),
      orderBy: desc(biuChains.endedAt),
      limit: input.limit,
      offset: input.offset,
      with: {
        sets: {
          orderBy: desc(biuSets.position),
          limit: 1,
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
          },
        },
      },
    });

    return chains;
  });
