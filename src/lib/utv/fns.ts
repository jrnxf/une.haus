import { createServerFn } from "@tanstack/react-start";

import * as fs from "node:fs/promises";
import path from "node:path";

import { zodValidator } from "@tanstack/zod-adapter";
import { and, asc, count, desc, eq, gt, ilike, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/db";
import {
  USER_DISCIPLINES,
  muxVideos,
  users,
  utvClaps,
  utvVideoLikes,
  utvVideoMessages,
  utvVideoRiders,
  utvVideos,
  utvVideoSuggestionMessages,
  utvVideoSuggestions,
  type UtvVideoSuggestionDiff,
} from "~/db/schema";
import { PAGE_SIZE } from "~/lib/constants";
import { invariant } from "~/lib/invariant";
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware";
import { createNotification } from "~/lib/notifications/helpers";
import {
  createUtvSuggestionSchema,
  getUtvSuggestionSchema,
  listUtvSuggestionsSchema,
  listUtvVideosSchema,
  reviewUtvSuggestionSchema,
} from "~/lib/utv/schemas";

const getUtvVideoSchema = z.object({
  id: z.number(),
});

export const getUtvVideoServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUtvVideoSchema))
  .handler(async ({ data: { id } }) => {
    const video = await db.query.utvVideos.findFirst({
      where: eq(utvVideos.id, id),
      with: {
        video: true,
        likes: {
          with: {
            user: {
              columns: {
                avatarId: true,
                id: true,
                name: true,
              },
            },
          },
        },
        riders: {
          with: {
            user: {
              columns: {
                avatarId: true,
                id: true,
                name: true,
              },
            },
          },
          orderBy: [asc(utvVideoRiders.order)],
        },
      },
    });

    if (!video) {
      throw new Error("Video not found");
    }

    return video;
  });

export const allUtvVideosServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const likesSubquery = db
    .select({
      utvVideoId: utvVideoLikes.utvVideoId,
      count: count().as("likes_count"),
    })
    .from(utvVideoLikes)
    .groupBy(utvVideoLikes.utvVideoId)
    .as("likes_sq");

  const messagesSubquery = db
    .select({
      utvVideoId: utvVideoMessages.utvVideoId,
      count: count().as("messages_count"),
    })
    .from(utvVideoMessages)
    .groupBy(utvVideoMessages.utvVideoId)
    .as("messages_sq");

  return await db
    .select({
      id: utvVideos.id,
      title: utvVideos.title,
      legacyUrl: utvVideos.legacyUrl,
      scale: utvVideos.thumbnailScale,
      thumbnailSeconds: utvVideos.thumbnailSeconds,
      assetId: muxVideos.assetId,
      playbackId: muxVideos.playbackId,
      likesCount: sql<number>`COALESCE(${likesSubquery.count}, 0)`,
      messagesCount: sql<number>`COALESCE(${messagesSubquery.count}, 0)`,
    })
    .from(utvVideos)
    .leftJoin(muxVideos, eq(utvVideos.muxAssetId, muxVideos.assetId))
    .leftJoin(likesSubquery, eq(utvVideos.id, likesSubquery.utvVideoId))
    .leftJoin(messagesSubquery, eq(utvVideos.id, messagesSubquery.utvVideoId))
    .orderBy(asc(utvVideos.id));
});

export const listUtvWritersServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const rows = await db
    .selectDistinct({
      name: sql<string>`COALESCE(${users.name}, ${utvVideoRiders.name})`,
    })
    .from(utvVideoRiders)
    .leftJoin(users, eq(utvVideoRiders.userId, users.id))
    .where(
      sql`COALESCE(${users.name}, ${utvVideoRiders.name}) IS NOT NULL`,
    )
    .orderBy(sql`COALESCE(${users.name}, ${utvVideoRiders.name})`);
  return rows.map((r) => r.name);
});

export const listUtvVideosServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listUtvVideosSchema))
  .handler(async ({ data: input }) => {
    const likesSubquery = db
      .select({
        utvVideoId: utvVideoLikes.utvVideoId,
        count: count().as("likes_count"),
      })
      .from(utvVideoLikes)
      .groupBy(utvVideoLikes.utvVideoId)
      .as("likes_sq");

    const messagesSubquery = db
      .select({
        utvVideoId: utvVideoMessages.utvVideoId,
        count: count().as("messages_count"),
      })
      .from(utvVideoMessages)
      .groupBy(utvVideoMessages.utvVideoId)
      .as("messages_sq");

    return await db
      .select({
        id: utvVideos.id,
        title: utvVideos.title,
        legacyUrl: utvVideos.legacyUrl,
        scale: utvVideos.thumbnailScale,
        thumbnailSeconds: utvVideos.thumbnailSeconds,
        assetId: muxVideos.assetId,
        playbackId: muxVideos.playbackId,
        likesCount: sql<number>`COALESCE(${likesSubquery.count}, 0)`,
        messagesCount: sql<number>`COALESCE(${messagesSubquery.count}, 0)`,
      })
      .from(utvVideos)
      .leftJoin(muxVideos, eq(utvVideos.muxAssetId, muxVideos.assetId))
      .leftJoin(likesSubquery, eq(utvVideos.id, likesSubquery.utvVideoId))
      .leftJoin(messagesSubquery, eq(utvVideos.id, messagesSubquery.utvVideoId))
      .where(
        and(
          input.q ? ilike(utvVideos.title, `%${input.q}%`) : undefined,
          input.cursor ? gt(utvVideos.id, input.cursor) : undefined,
          input.disciplines && input.disciplines.length > 0
            ? sql`${utvVideos.disciplines}::jsonb ?| array[${sql.join(
                input.disciplines.map((d) => sql`${d}`),
                sql`,`,
              )}]`
            : undefined,
          input.writers && input.writers.length > 0
            ? sql`EXISTS (
                SELECT 1 FROM ${utvVideoRiders}
                LEFT JOIN ${users} ON ${utvVideoRiders.userId} = ${users.id}
                WHERE ${utvVideoRiders.utvVideoId} = ${utvVideos.id}
                AND COALESCE(${users.name}, ${utvVideoRiders.name}) IN (${sql.join(
                  input.writers.map((w) => sql`${w}`),
                  sql`,`,
                )})
              )`
            : undefined,
        ),
      )
      .orderBy(asc(utvVideos.id))
      .limit(PAGE_SIZE);
  });

const saveScalesSchema = z.object({
  scales: z.record(z.string(), z.number()),
});

export const saveUtvScalesServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(saveScalesSchema))
  .handler(async ({ data }) => {
    const filePath = path.join(
      process.cwd(),
      "src/db/scripts/vault-scales.bak.ts",
    );

    // Read existing scales if file exists
    let existingScales: Record<number, number> = {};
    try {
      const content = await fs.readFile(filePath, "utf8");
      // Parse existing scales from the TS file
      const match = content.match(
        /export const vaultScales[^=]*=\s*(\{[\s\S]*\})\s*(?:as const)?;?/,
      );
      if (match) {
        // Use Function constructor to safely parse the object literal
        existingScales = new Function(`return ${match[1]}`)();
      }
    } catch {
      // File doesn't exist yet, start fresh
    }

    // Merge new scales with existing
    const mergedScales = { ...existingScales, ...data.scales };

    // Generate TypeScript file content
    const tsContent = `export const vaultScales: Record<number, number> = ${JSON.stringify(mergedScales, null, 2)};
`;

    await fs.writeFile(filePath, tsContent);

    return { success: true, count: Object.keys(data.scales).length };
  });

const updateScaleSchema = z.object({
  id: z.number(),
  scale: z.number().min(1).max(3),
});

export const updateUtvScaleServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateScaleSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    await db
      .update(utvVideos)
      .set({ thumbnailScale: data.scale })
      .where(eq(utvVideos.id, data.id));

    return { id: data.id, scale: data.scale };
  });

const updateThumbnailSecondsSchema = z.object({
  id: z.number(),
  thumbnailSeconds: z.number().min(0),
});

export const updateUtvThumbnailSecondsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateThumbnailSecondsSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    await db
      .update(utvVideos)
      .set({ thumbnailSeconds: data.thumbnailSeconds })
      .where(eq(utvVideos.id, data.id));

    return { id: data.id, thumbnailSeconds: data.thumbnailSeconds };
  });

const updateTitleSchema = z.object({
  id: z.number(),
  title: z.string(),
});

export const updateUtvTitleServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateTitleSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    await db
      .update(utvVideos)
      .set({ title: data.title })
      .where(eq(utvVideos.id, data.id));

    return { id: data.id, title: data.title };
  });

const adminUpdateSchema = z.object({
  id: z.number(),
  title: z.string(),
  disciplines: z.array(z.enum(USER_DISCIPLINES)).nullable(),
  riders: z.array(
    z.object({
      userId: z.number().nullable(),
      name: z.string().nullable(),
    }),
  ),
  thumbnailScale: z.number().min(1).max(3),
  thumbnailSeconds: z.number().min(0),
});

export const adminUpdateUtvVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(adminUpdateSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    await db
      .update(utvVideos)
      .set({
        title: data.title,
        disciplines: data.disciplines,
        thumbnailScale: data.thumbnailScale,
        thumbnailSeconds: data.thumbnailSeconds,
      })
      .where(eq(utvVideos.id, data.id));

    // Replace riders
    await db
      .delete(utvVideoRiders)
      .where(eq(utvVideoRiders.utvVideoId, data.id));

    if (data.riders.length > 0) {
      await db.insert(utvVideoRiders).values(
        data.riders.map((rider, index) => ({
          utvVideoId: data.id,
          userId: rider.userId,
          name: rider.name,
          order: index,
        })),
      );
    }

    return { id: data.id };
  });

export const getUtvClapsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const result = await db.query.utvClaps.findFirst();
  return result?.count ?? 0;
});

const addUtvClapsSchema = z.object({
  amount: z.number().int().positive(),
});

export const addUtvClapsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(addUtvClapsSchema))
  .handler(async ({ data }) => {
    // Upsert: insert if not exists, otherwise increment
    await db
      .insert(utvClaps)
      .values({ id: 1, count: data.amount })
      .onConflictDoUpdate({
        target: utvClaps.id,
        set: { count: sql`${utvClaps.count} + ${data.amount}` },
      });

    const result = await db.query.utvClaps.findFirst();
    return result?.count ?? 0;
  });

// ==================== SUGGESTIONS ====================

export const listUtvSuggestionsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listUtvSuggestionsSchema))
  .handler(async ({ data: input }) => {
    const limit = input?.limit ?? 20;

    const suggestions = await db.query.utvVideoSuggestions.findMany({
      where: and(
        input?.status
          ? eq(utvVideoSuggestions.status, input.status)
          : undefined,
        input?.utvVideoId
          ? eq(utvVideoSuggestions.utvVideoId, input.utvVideoId)
          : undefined,
        input?.cursor ? lt(utvVideoSuggestions.id, input.cursor) : undefined,
      ),
      with: {
        utvVideo: {
          columns: {
            id: true,
            title: true,
            legacyTitle: true,
          },
        },
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
        likes: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
          },
        },
        messages: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
          },
          orderBy: [asc(utvVideoSuggestionMessages.createdAt)],
        },
      },
      orderBy: [desc(utvVideoSuggestions.createdAt)],
      limit,
    });

    return suggestions;
  });

export const getUtvSuggestionServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUtvSuggestionSchema))
  .handler(async ({ data: { id } }) => {
    const suggestion = await db.query.utvVideoSuggestions.findFirst({
      where: eq(utvVideoSuggestions.id, id),
      with: {
        utvVideo: {
          columns: {
            id: true,
            title: true,
            legacyTitle: true,
          },
          with: {
            video: {
              columns: {
                playbackId: true,
              },
            },
          },
        },
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
        likes: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
          },
        },
        messages: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
            likes: {
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    avatarId: true,
                  },
                },
              },
            },
          },
          orderBy: [asc(utvVideoSuggestions.createdAt)],
        },
      },
    });

    return suggestion ?? null;
  });

export const createUtvSuggestionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createUtvSuggestionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    // Verify video exists
    const video = await db.query.utvVideos.findFirst({
      where: eq(utvVideos.id, data.utvVideoId),
    });

    invariant(video, "Video not found");

    const [suggestion] = await db
      .insert(utvVideoSuggestions)
      .values({
        utvVideoId: data.utvVideoId,
        diff: data.diff as UtvVideoSuggestionDiff,
        reason: data.reason,
        submittedByUserId: context.user.id,
      })
      .returning();

    invariant(suggestion, "Failed to create suggestion");
    return suggestion;
  });

export const reviewUtvSuggestionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewUtvSuggestionSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data, context }) => {
    const { id, status, reviewNotes } = data;

    // Get the suggestion
    const suggestion = await db.query.utvVideoSuggestions.findFirst({
      where: eq(utvVideoSuggestions.id, id),
    });

    invariant(suggestion, "Suggestion not found");
    invariant(suggestion.status === "pending", "Suggestion already reviewed");

    // If approved, apply the diff
    if (status === "approved") {
      const diff = suggestion.diff;
      const updateData: Record<string, unknown> = {};

      // Apply title change
      if (diff.title) {
        updateData.title = diff.title.new;
      }

      // Apply disciplines change
      if (diff.disciplines) {
        updateData.disciplines = diff.disciplines.new;
      }

      // Update video if we have changes
      if (Object.keys(updateData).length > 0) {
        await db
          .update(utvVideos)
          .set(updateData)
          .where(eq(utvVideos.id, suggestion.utvVideoId));
      }

      // Handle riders changes
      if (diff.riders) {
        // Delete existing riders
        await db
          .delete(utvVideoRiders)
          .where(eq(utvVideoRiders.utvVideoId, suggestion.utvVideoId));

        // Insert new riders
        if (diff.riders.new.length > 0) {
          await db.insert(utvVideoRiders).values(
            diff.riders.new.map((rider, index) => ({
              utvVideoId: suggestion.utvVideoId,
              userId: rider.userId,
              name: rider.name,
              order: index,
            })),
          );
        }
      }
    }

    // Update suggestion status
    const [updatedSuggestion] = await db
      .update(utvVideoSuggestions)
      .set({
        status,
        reviewedByUserId: context.user.id,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(utvVideoSuggestions.id, id))
      .returning();

    // Notify submitter of review result
    if (suggestion.submittedByUserId !== context.user.id) {
      createNotification({
        userId: suggestion.submittedByUserId,
        actorId: context.user.id,
        type: "review",
        entityType: "utvVideoSuggestion",
        entityId: id,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityTitle: status === "approved" ? "approved" : "rejected",
        },
      }).catch(console.error);
    }

    return updatedSuggestion;
  });
