import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  handleAssetReady,
  handleUploadAssetCreated,
} from "~/lib/media/ops.server"
import { randomId, truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("mux webhook integration", () => {
  it("handleUploadAssetCreated inserts a new muxVideo row", async () => {
    const assetId = randomId("asset")
    const uploadId = randomId("upload")

    await handleUploadAssetCreated({ assetId, uploadId })

    const row = await db.query.muxVideos.findFirst({
      where: (table, { eq }) => eq(table.assetId, assetId),
    })
    expect(row).toEqual(
      expect.objectContaining({
        assetId,
        uploadId,
        playbackId: null,
      }),
    )
  })

  it("handleUploadAssetCreated is idempotent on duplicate", async () => {
    const assetId = randomId("asset")
    const uploadId = randomId("upload")

    await handleUploadAssetCreated({ assetId, uploadId })
    await handleUploadAssetCreated({ assetId, uploadId })

    const rows = await db.query.muxVideos.findMany({
      where: (table, { eq }) => eq(table.assetId, assetId),
    })
    expect(rows).toHaveLength(1)
  })

  it("handleAssetReady upserts playbackId onto an existing row", async () => {
    const assetId = randomId("asset")
    const uploadId = randomId("upload")
    const playbackId = randomId("playback")

    // First: upload creates the row
    await handleUploadAssetCreated({ assetId, uploadId })

    // Then: asset ready adds playbackId
    await handleAssetReady({ assetId, playbackId })

    const row = await db.query.muxVideos.findFirst({
      where: (table, { eq }) => eq(table.assetId, assetId),
    })
    expect(row).toEqual(
      expect.objectContaining({
        assetId,
        uploadId,
        playbackId,
      }),
    )
  })

  it("handles reversed order: asset_ready before upload_asset_created", async () => {
    const assetId = randomId("asset")
    const uploadId = randomId("upload")
    const playbackId = randomId("playback")

    // asset.ready arrives first (creates row with no uploadId)
    await handleAssetReady({ assetId, playbackId })

    // upload.asset_created arrives second (should upsert uploadId)
    await handleUploadAssetCreated({ assetId, uploadId })

    const row = await db.query.muxVideos.findFirst({
      where: (table, { eq }) => eq(table.assetId, assetId),
    })
    expect(row).toEqual(
      expect.objectContaining({
        assetId,
        uploadId,
        playbackId,
      }),
    )

    const allRows = await db.query.muxVideos.findMany()
    expect(allRows).toHaveLength(1)
  })

  it("handleAssetReady does not overwrite existing uploadId", async () => {
    const assetId = randomId("asset")
    const uploadId = randomId("upload")
    const playbackId = randomId("playback")

    // upload.asset_created arrives first
    await handleUploadAssetCreated({ assetId, uploadId })

    // asset.ready arrives second — should add playbackId but keep uploadId
    await handleAssetReady({ assetId, playbackId })

    const row = await db.query.muxVideos.findFirst({
      where: (table, { eq }) => eq(table.assetId, assetId),
    })
    expect(row?.uploadId).toBe(uploadId)
    expect(row?.playbackId).toBe(playbackId)
  })

  it("handleAssetReady creates row when no prior row exists", async () => {
    const assetId = randomId("asset")
    const playbackId = randomId("playback")

    // asset.ready with no prior row — should still create a row
    await handleAssetReady({ assetId, playbackId })

    const row = await db.query.muxVideos.findFirst({
      where: (table, { eq }) => eq(table.assetId, assetId),
    })
    expect(row).toEqual(
      expect.objectContaining({
        assetId,
        playbackId,
        uploadId: null,
      }),
    )
  })

  it("full lifecycle: asset_created then asset_ready populates all fields", async () => {
    const assetId = randomId("asset")
    const uploadId = randomId("upload")
    const playbackId = randomId("playback")

    await handleUploadAssetCreated({ assetId, uploadId })
    await handleAssetReady({ assetId, playbackId })

    const row = await db.query.muxVideos.findFirst({
      where: (table, { eq }) => eq(table.assetId, assetId),
    })
    expect(row).toEqual(
      expect.objectContaining({
        assetId,
        uploadId,
        playbackId,
      }),
    )

    // Verify only one row exists
    const allRows = await db.query.muxVideos.findMany()
    expect(allRows).toHaveLength(1)
  })
})
