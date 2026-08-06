import "@tanstack/react-start/server-only"
import { and, asc, countDistinct, eq, isNotNull, isNull, ne } from "drizzle-orm"

import { type LandTrickArgs, type UnlandTrickArgs } from "./schemas"
import { db } from "~/db"
import {
  biuSets,
  muxVideos,
  riuSets,
  riuSubmissions,
  siuSets,
  trickVideos,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { deleteMuxAssetIfUnreferenced } from "~/lib/media/ops.server"
import { submitVideo } from "~/lib/tricks/videos/ops.server"

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

// A landing is derived, not stored: any non-rejected trickVideos row by the
// user for a trick means they've landed it. "pending" counts immediately so
// review never blocks the checklist loop; "rejected" revokes the landing.
export type Landing = {
  trickId: number
  status: "active" | "pending"
  videoIds: number[]
  firstLandedAt: Date
}

export async function landingsForUser(userId: number): Promise<Landing[]> {
  const rows = await db.query.trickVideos.findMany({
    where: and(
      eq(trickVideos.submittedByUserId, userId),
      ne(trickVideos.status, "rejected"),
    ),
    columns: {
      id: true,
      trickId: true,
      status: true,
      createdAt: true,
    },
    orderBy: [asc(trickVideos.createdAt)],
  })

  // Reduce to one landing per trick: "active" wins over "pending", videoIds
  // keeps every proof, firstLandedAt is the earliest submission.
  const byTrick = new Map<number, Landing>()
  for (const row of rows) {
    const existing = byTrick.get(row.trickId)
    if (existing) {
      existing.videoIds.push(row.id)
      if (row.status === "active") existing.status = "active"
    } else {
      byTrick.set(row.trickId, {
        trickId: row.trickId,
        status: row.status === "active" ? "active" : "pending",
        videoIds: [row.id],
        firstLandedAt: row.createdAt,
      })
    }
  }

  return [...byTrick.values()]
}

export async function landingCounts(): Promise<
  { trickId: number; riders: number }[]
> {
  return db
    .select({
      trickId: trickVideos.trickId,
      riders: countDistinct(trickVideos.submittedByUserId),
    })
    .from(trickVideos)
    .where(ne(trickVideos.status, "rejected"))
    .groupBy(trickVideos.trickId)
}

export async function landTrick({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: LandTrickArgs
}) {
  return submitVideo({
    context,
    data: {
      trickId: data.trickId,
      muxAssetId: data.muxAssetId,
      notes: data.notes ?? null,
    },
  })
}

export type GameVideoOption = {
  id: string
  label: string
  game: "riu" | "biu" | "siu"
  kind: "set" | "submission"
  muxAssetId: string
  playbackId: string | null
}

const tag = <
  R,
  G extends GameVideoOption["game"],
  K extends GameVideoOption["kind"],
>(
  rows: R[],
  game: G,
  kind: K,
) => rows.map((row) => ({ ...row, game, kind }))

// The rider's own game footage with playable mux assets — sets and
// submissions across every game type, the candidates for linking as landing
// proof. Newest first; an asset appearing in several places is offered once.
// Deliberately no per-asset mux calls (e.g. durations): an active rider has
// hundreds of candidates and live retrieval blew past the server's response
// timeout. Duration display can return once it's persisted from the
// asset.ready webhook.
export async function gameVideosForUser(
  userId: number,
): Promise<GameVideoOption[]> {
  // biu and siu sets share a shape (soft-deletable, self-named); riu sets
  // have no soft delete, and riu submissions borrow their host set's name.
  const softDeletableSetRows = (table: typeof biuSets | typeof siuSets) =>
    db
      .select({
        id: table.id,
        name: table.name,
        muxAssetId: muxVideos.assetId,
        playbackId: muxVideos.playbackId,
        createdAt: table.createdAt,
      })
      .from(table)
      .innerJoin(muxVideos, eq(table.muxAssetId, muxVideos.assetId))
      .where(
        and(
          eq(table.userId, userId),
          isNull(table.deletedAt),
          isNotNull(muxVideos.playbackId),
        ),
      )

  const [riuSetRows, riuSubmissionRows, biuSetRows, siuSetRows] =
    await Promise.all([
      db
        .select({
          id: riuSets.id,
          name: riuSets.name,
          muxAssetId: muxVideos.assetId,
          playbackId: muxVideos.playbackId,
          createdAt: riuSets.createdAt,
        })
        .from(riuSets)
        .innerJoin(muxVideos, eq(riuSets.muxAssetId, muxVideos.assetId))
        .where(
          and(eq(riuSets.userId, userId), isNotNull(muxVideos.playbackId)),
        ),
      db
        .select({
          id: riuSubmissions.id,
          name: riuSets.name,
          muxAssetId: muxVideos.assetId,
          playbackId: muxVideos.playbackId,
          createdAt: riuSubmissions.createdAt,
        })
        .from(riuSubmissions)
        .innerJoin(riuSets, eq(riuSubmissions.riuSetId, riuSets.id))
        .innerJoin(muxVideos, eq(riuSubmissions.muxAssetId, muxVideos.assetId))
        .where(
          and(
            eq(riuSubmissions.userId, userId),
            isNotNull(muxVideos.playbackId),
          ),
        ),
      softDeletableSetRows(biuSets),
      softDeletableSetRows(siuSets),
    ])

  const candidates = [
    ...tag(riuSetRows, "riu", "set"),
    ...tag(riuSubmissionRows, "riu", "submission"),
    ...tag(biuSetRows, "biu", "set"),
    ...tag(siuSetRows, "siu", "set"),
  ].toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  // The picker's radio value is the mux asset id, so an asset that shows up
  // in several places (e.g. a set reused as a submission) is offered once —
  // the newest occurrence wins.
  const seenAssets = new Set<string>()
  const options: GameVideoOption[] = []
  for (const row of candidates) {
    if (seenAssets.has(row.muxAssetId)) continue
    seenAssets.add(row.muxAssetId)
    options.push({
      id: `${row.game}-${row.kind}-${row.id}`,
      label: row.name,
      game: row.game,
      kind: row.kind,
      muxAssetId: row.muxAssetId,
      playbackId: row.playbackId,
    })
  }

  return options
}

export async function unlandTrick({
  data,
  context,
  deleteRemoteAsset,
}: {
  context: AuthenticatedContext
  data: UnlandTrickArgs
  // Injectable so integration tests can observe/skip the remote mux call
  deleteRemoteAsset?: (assetId: string) => Promise<void>
}) {
  const rows = await db
    .delete(trickVideos)
    .where(
      and(
        eq(trickVideos.trickId, data.trickId),
        eq(trickVideos.submittedByUserId, context.user.id),
        ne(trickVideos.status, "rejected"),
      ),
    )
    .returning({ muxAssetId: trickVideos.muxAssetId })

  invariant(rows.length > 0, "No landing to remove")

  // A direct-upload asset with no other references dies with the landing; a
  // shared asset (e.g. vault-linked) keeps living — only the row dies.
  const assetIds = [...new Set(rows.map((row) => row.muxAssetId))]
  await Promise.all(
    assetIds.map((assetId) =>
      deleteMuxAssetIfUnreferenced(assetId, deleteRemoteAsset),
    ),
  )

  return { removed: rows.length }
}
