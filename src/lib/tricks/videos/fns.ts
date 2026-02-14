import { createServerFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import { and, asc, desc, eq, lt } from "drizzle-orm";

import { db } from "~/db";
import { tricks, trickVideos } from "~/db/schema";
import { invariant } from "~/lib/invariant";
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware";
import { createNotification } from "~/lib/notifications/helpers";

import {
  deleteVideoSchema,
  demoteVideoSchema,
  listPendingVideosSchema,
  listVideosSchema,
  reorderVideosSchema,
  reviewVideoSchema,
  submitVideoSchema,
} from "./schemas";

const MAX_ACTIVE_VIDEOS = 5;

// ==================== USER OPERATIONS ====================

export const listVideosServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listVideosSchema))
  .handler(async ({ data }) => {
    const videos = await db.query.trickVideos.findMany({
      where: and(
        eq(trickVideos.trickId, data.trickId),
        data.status ? eq(trickVideos.status, data.status) : undefined,
      ),
      with: {
        video: {
          columns: {
            playbackId: true,
          },
        },
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
      },
      orderBy: [asc(trickVideos.sortOrder), asc(trickVideos.createdAt)],
    });

    return videos;
  });

export const submitVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(submitVideoSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    // Verify trick exists
    const trick = await db.query.tricks.findFirst({
      where: eq(tricks.id, data.trickId),
    });

    invariant(trick, "Trick not found");

    const [video] = await db
      .insert(trickVideos)
      .values({
        trickId: data.trickId,
        muxAssetId: data.muxAssetId,
        notes: data.notes,
        submittedByUserId: context.user.id,
        status: "pending",
      })
      .returning();

    invariant(video, "Failed to submit video");
    return video;
  });

// ==================== ADMIN OPERATIONS ====================

export const listPendingVideosServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listPendingVideosSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: input }) => {
    const limit = input?.limit ?? 20;

    const videos = await db.query.trickVideos.findMany({
      where: and(
        eq(trickVideos.status, "pending"),
        input?.cursor ? lt(trickVideos.id, input.cursor) : undefined,
      ),
      with: {
        trick: {
          columns: {
            id: true,
            slug: true,
            name: true,
          },
        },
        video: {
          columns: {
            playbackId: true,
          },
        },
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
      },
      orderBy: [desc(trickVideos.createdAt)],
      limit,
    });

    return videos;
  });

export const reviewVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewVideoSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data, context }) => {
    const { id, status } = data;

    // Get the video
    const video = await db.query.trickVideos.findFirst({
      where: eq(trickVideos.id, id),
    });

    invariant(video, "Video not found");
    invariant(video.status === "pending", "Video already reviewed");

    // If approving (setting to active), check the 5-video limit
    if (status === "active") {
      const activeCount = await db.query.trickVideos.findMany({
        where: and(
          eq(trickVideos.trickId, video.trickId),
          eq(trickVideos.status, "active"),
        ),
      });

      if (activeCount.length >= MAX_ACTIVE_VIDEOS) {
        throw new Error(
          `Cannot have more than ${MAX_ACTIVE_VIDEOS} active videos. Demote one first.`,
        );
      }

      // Get the next sort order
      const maxSortOrder = Math.max(...activeCount.map((v) => v.sortOrder), -1);

      const [updatedVideo] = await db
        .update(trickVideos)
        .set({
          status,
          sortOrder: maxSortOrder + 1,
          reviewedByUserId: context.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(trickVideos.id, id))
        .returning();

      // Get the trick for navigation
      const trick = await db.query.tricks.findFirst({
        where: eq(tricks.id, video.trickId),
        columns: { slug: true },
      });

      // Notify the user who submitted the video
      if (video.submittedByUserId) {
        await createNotification({
          userId: video.submittedByUserId,
          actorId: context.user.id,
          type: "review",
          entityType: "trickVideo",
          entityId: id,
          data: {
            actorName: context.user.name,
            actorAvatarId: context.user.avatarId,
            entityTitle: "approved",
            trickSlug: trick?.slug,
          },
        });
      }

      return updatedVideo;
    }

    // Rejecting
    const [updatedVideo] = await db
      .update(trickVideos)
      .set({
        status,
        reviewedByUserId: context.user.id,
        reviewedAt: new Date(),
      })
      .where(eq(trickVideos.id, id))
      .returning();

    // Get the trick for navigation
    const trick = await db.query.tricks.findFirst({
      where: eq(tricks.id, video.trickId),
      columns: { slug: true },
    });

    // Notify the user who submitted the video
    if (video.submittedByUserId) {
      await createNotification({
        userId: video.submittedByUserId,
        actorId: context.user.id,
        type: "review",
        entityType: "trickVideo",
        entityId: id,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityTitle: "rejected",
          trickSlug: trick?.slug,
        },
      });
    }

    return updatedVideo;
  });

export const reorderVideosServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reorderVideosSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { trickId, videoIds } = data;

    // Verify all videos belong to this trick and are active
    const videos = await db.query.trickVideos.findMany({
      where: and(
        eq(trickVideos.trickId, trickId),
        eq(trickVideos.status, "active"),
      ),
    });

    const activeIds = new Set(videos.map((v) => v.id));
    for (const id of videoIds) {
      invariant(activeIds.has(id), `Video ${id} is not active for this trick`);
    }

    // Update sort orders
    await Promise.all(
      videoIds.map((id, index) =>
        db
          .update(trickVideos)
          .set({ sortOrder: index })
          .where(eq(trickVideos.id, id)),
      ),
    );

    return { success: true };
  });

export const demoteVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(demoteVideoSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { id } = data;

    const video = await db.query.trickVideos.findFirst({
      where: eq(trickVideos.id, id),
    });

    invariant(video, "Video not found");
    invariant(video.status === "active", "Video is not active");

    const [updatedVideo] = await db
      .update(trickVideos)
      .set({
        status: "pending",
        sortOrder: 0,
      })
      .where(eq(trickVideos.id, id))
      .returning();

    return updatedVideo;
  });

export const deleteVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteVideoSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { id } = data;

    const [deletedVideo] = await db
      .delete(trickVideos)
      .where(eq(trickVideos.id, id))
      .returning();

    invariant(deletedVideo, "Video not found");
    return deletedVideo;
  });
