import { createServerFn } from "@tanstack/react-start";

import * as fs from "node:fs/promises";
import path from "node:path";

import { zodValidator } from "@tanstack/zod-adapter";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/db";
import { muxVideos, utvVideos } from "~/db/schema";
import { adminOnlyMiddleware } from "~/lib/middleware";

export const allUtvVideosServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  return await db
    .select({
      id: utvVideos.id,
      title: utvVideos.title,
      legacyUrl: utvVideos.legacyUrl,
      scale: utvVideos.thumbnailScale,
      thumbnailSeconds: utvVideos.thumbnailSeconds,
      assetId: muxVideos.assetId,
      playbackId: muxVideos.playbackId,
    })
    .from(utvVideos)
    .leftJoin(muxVideos, eq(utvVideos.muxAssetId, muxVideos.assetId))
    .orderBy(asc(utvVideos.id));
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
