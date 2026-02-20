import { createServerFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import pluralize from "pluralize";
import { and, count, desc, eq } from "drizzle-orm";

import { db } from "~/db";
import { siuChains, siuStackArchiveVotes, siuStacks, users } from "~/db/schema";
import { invariant } from "~/lib/invariant";
import {
  adminOnlyMiddleware,
  authMiddleware,
  authOptionalMiddleware,
} from "~/lib/middleware";
import {
  createNotification,
  notifyFollowers,
} from "~/lib/notifications/helpers";

import {
  archiveChainSchema,
  deleteStackSchema,
  getStackSchema,
  listArchivedChainsSchema,
  removeArchiveVoteSchema,
  stackUpSchema,
  startChainSchema,
  voteToArchiveSchema,
} from "./schemas";

const ARCHIVE_VOTE_THRESHOLD = 5;

// Get active chain with all stacks (ordered by position desc for UI)
export const getActiveChainServerFn = createServerFn({ method: "GET" })
  .middleware([authOptionalMiddleware])
  .handler(async () => {
    const activeChain = await db.query.siuChains.findFirst({
      where: eq(siuChains.status, "active"),
      with: {
        stacks: {
          orderBy: desc(siuStacks.position),
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
            parentStack: {
              columns: { id: true, name: true },
              with: {
                user: {
                  columns: { id: true, name: true },
                },
              },
            },
          },
        },
        archiveVotes: {
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
          },
        },
      },
    });

    return activeChain ?? null;
  });

// Get single stack with full details
export const getStackServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getStackSchema))
  .handler(async ({ data: input }) => {
    const stack = await db.query.siuStacks.findFirst({
      where: eq(siuStacks.id, input.stackId),
      with: {
        chain: {
          columns: { id: true, status: true },
          with: {
            archiveVotes: {
              with: {
                user: {
                  columns: { id: true, name: true, avatarId: true },
                },
              },
            },
          },
        },
        user: {
          columns: { id: true, name: true, avatarId: true },
        },
        video: {
          columns: { playbackId: true },
        },
        parentStack: {
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

    return stack;
  });

// Start a new chain (admin only)
export const startChainServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(startChainSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    // Check if there's already an active chain
    const existingActiveChain = await db.query.siuChains.findFirst({
      where: eq(siuChains.status, "active"),
    });

    invariant(!existingActiveChain, "An active chain already exists");

    // Create new chain
    const [chain] = await db
      .insert(siuChains)
      .values({ status: "active" })
      .returning();

    // Create first stack
    const [stack] = await db
      .insert(siuStacks)
      .values({
        chainId: chain.id,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: 1,
        parentStackId: null,
      })
      .returning();

    return { chain, stack };
  });

// Stack up (continue the chain with full line + new trick)
export const stackUpServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(stackUpSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    // Get the parent stack
    const parentStack = await db.query.siuStacks.findFirst({
      where: eq(siuStacks.id, input.parentStackId),
      with: {
        chain: true,
      },
    });

    invariant(parentStack, "Parent stack not found");
    invariant(parentStack.chain.status === "active", "Chain is not active");
    invariant(
      parentStack.userId !== userId,
      "You cannot stack up your own trick",
    );

    // Ensure this is the latest stack in the chain (no one else has stacked it)
    const existingStack = await db.query.siuStacks.findFirst({
      where: eq(siuStacks.parentStackId, input.parentStackId),
    });

    invariant(!existingStack, "This stack has already been continued");

    // Create the new stack
    const [stack] = await db
      .insert(siuStacks)
      .values({
        chainId: parentStack.chainId,
        userId,
        muxAssetId: input.muxAssetId,
        name: input.name,
        position: parentStack.position + 1,
        parentStackId: parentStack.id,
      })
      .returning();

    // Notify followers about the new SIU stack
    notifyFollowers({
      actorId: userId,
      actorName: context.user.name,
      actorAvatarId: context.user.avatarId,
      type: "new_content",
      entityType: "siuStack",
      entityId: stack.id,
      entityTitle: stack.name,
    }).catch(console.error);

    return stack;
  });

// Vote to archive chain
export const voteToArchiveServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(voteToArchiveSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const chain = await db.query.siuChains.findFirst({
      where: eq(siuChains.id, input.chainId),
    });

    invariant(chain, "Chain not found");
    invariant(chain.status === "active", "Chain is not active");

    // Check if already voted
    const existingVote = await db.query.siuStackArchiveVotes.findFirst({
      where: and(
        eq(siuStackArchiveVotes.chainId, input.chainId),
        eq(siuStackArchiveVotes.userId, userId),
      ),
    });

    invariant(!existingVote, "You have already voted to archive this chain");

    // Add vote
    await db.insert(siuStackArchiveVotes).values({
      chainId: input.chainId,
      userId,
    });

    // Check vote count
    const [result] = await db
      .select({ count: count() })
      .from(siuStackArchiveVotes)
      .where(eq(siuStackArchiveVotes.chainId, input.chainId));

    const voteCount = result?.count ?? 0;

    // If threshold reached, notify admins
    if (voteCount >= ARCHIVE_VOTE_THRESHOLD) {
      // Get all admins
      const admins = await db.query.users.findMany({
        where: eq(users.type, "admin"),
        columns: { id: true },
      });

      // Get chain details for notification
      const chainWithStacks = await db.query.siuChains.findFirst({
        where: eq(siuChains.id, input.chainId),
        with: {
          stacks: {
            orderBy: desc(siuStacks.position),
            limit: 1,
          },
        },
      });

      const latestStack = chainWithStacks?.stacks[0];

      // Notify each admin
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          actorId: userId,
          type: "archive_request",
          entityType: "siuChain",
          entityId: input.chainId,
          data: {
            actorName: context.user.name,
            actorAvatarId: context.user.avatarId,
            entityTitle: `Stack It Up chain with ${latestStack?.position ?? 0} ${pluralize("trick", latestStack?.position ?? 0)}`,
            entityPreview: `${voteCount} ${pluralize("vote", voteCount)} to archive`,
          },
        });
      }
    }

    return { voteCount, thresholdReached: voteCount >= ARCHIVE_VOTE_THRESHOLD };
  });

// Remove archive vote
export const removeArchiveVoteServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(removeArchiveVoteSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    await db
      .delete(siuStackArchiveVotes)
      .where(
        and(
          eq(siuStackArchiveVotes.chainId, input.chainId),
          eq(siuStackArchiveVotes.userId, userId),
        ),
      );

    // Get updated vote count
    const [result] = await db
      .select({ count: count() })
      .from(siuStackArchiveVotes)
      .where(eq(siuStackArchiveVotes.chainId, input.chainId));

    return { voteCount: result?.count ?? 0 };
  });

// Archive chain (admin only)
export const archiveChainServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(archiveChainSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: input, context }) => {
    const chain = await db.query.siuChains.findFirst({
      where: eq(siuChains.id, input.chainId),
      with: {
        stacks: {
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });

    invariant(chain, "Chain not found");
    invariant(chain.status === "active", "Chain is already archived");

    // Update chain status
    await db
      .update(siuChains)
      .set({ status: "archived", endedAt: new Date() })
      .where(eq(siuChains.id, input.chainId));

    // Get unique participants
    const participantIds = [...new Set(chain.stacks.map((s) => s.userId))];

    // Notify all participants that chain was archived
    for (const participantId of participantIds) {
      await createNotification({
        userId: participantId,
        actorId: context.user.id,
        type: "chain_archived",
        entityType: "siuChain",
        entityId: input.chainId,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityTitle: `Stack It Up chain with ${chain.stacks.length} ${pluralize("trick", chain.stacks.length)}`,
          entityPreview: "Chain has been archived",
        },
      });
    }

    return { success: true };
  });

// Delete stack (owner only, only if it's the latest)
export const deleteStackServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteStackSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const stack = await db.query.siuStacks.findFirst({
      where: eq(siuStacks.id, input.stackId),
    });

    invariant(stack, "Stack not found");
    invariant(stack.userId === userId, "Access denied");

    // Check if this is the latest stack (no children)
    const childStack = await db.query.siuStacks.findFirst({
      where: eq(siuStacks.parentStackId, stack.id),
    });

    invariant(!childStack, "Cannot delete a stack that has been continued");

    // Delete the stack
    const [deleted] = await db
      .delete(siuStacks)
      .where(eq(siuStacks.id, input.stackId))
      .returning();

    // If this was the only stack, archive the chain
    if (stack.position === 1) {
      await db
        .update(siuChains)
        .set({ status: "archived", endedAt: new Date() })
        .where(eq(siuChains.id, stack.chainId));
    }

    return deleted;
  });

// List archived chains
export const listArchivedChainsServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(listArchivedChainsSchema))
  .handler(async ({ data: input }) => {
    const chains = await db.query.siuChains.findMany({
      where: eq(siuChains.status, "archived"),
      orderBy: desc(siuChains.endedAt),
      limit: input.limit,
      offset: input.offset,
      with: {
        stacks: {
          orderBy: desc(siuStacks.position),
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

// Get all tricks in the line (for displaying what needs to be landed)
export const getLineServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getStackSchema))
  .handler(async ({ data: input }) => {
    const stack = await db.query.siuStacks.findFirst({
      where: eq(siuStacks.id, input.stackId),
      columns: { chainId: true },
    });

    if (!stack) return [];

    // Get all stacks in the chain ordered by position (ascending for line display)
    const stacks = await db.query.siuStacks.findMany({
      where: eq(siuStacks.chainId, stack.chainId),
      orderBy: siuStacks.position,
      columns: { id: true, name: true, position: true },
      with: {
        user: {
          columns: { id: true, name: true },
        },
      },
    });

    return stacks;
  });
