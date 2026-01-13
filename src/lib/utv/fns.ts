import { createServerFn } from "@tanstack/react-start";

import * as fs from "node:fs/promises";
import path from "node:path";

import { zodValidator } from "@tanstack/zod-adapter";
import { and, asc, count, eq, gt, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/db";
import {
  muxVideos,
  utvClaps,
  utvVideoLikes,
  utvVideoMessages,
  utvVideos,
} from "~/db/schema";
import { PAGE_SIZE } from "~/lib/constants";
import { adminOnlyMiddleware } from "~/lib/middleware";
import { listUtvVideosSchema } from "~/lib/utv/schemas";

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
