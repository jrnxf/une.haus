import { createServerFn } from "@tanstack/react-start";

import { asc, eq } from "drizzle-orm";

import { db } from "~/db";
import { muxVideos, utvVideos } from "~/db/schema";

export const allUtvVideosServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  return await db
    .select({
      id: utvVideos.id,
      title: utvVideos.title,
      legacyUrl: utvVideos.legacyUrl,
      assetId: muxVideos.assetId,
      playbackId: muxVideos.playbackId,
    })
    .from(utvVideos)
    .leftJoin(muxVideos, eq(utvVideos.muxAssetId, muxVideos.assetId))
    .orderBy(asc(utvVideos.id));
});
