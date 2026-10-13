import "@tanstack/react-start/server-only"
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
} from "drizzle-orm"

import {
  archiveIndex,
  chooseLead,
  chooseNewOrArchive,
  chooseTalk,
} from "./slots"
import { db } from "~/db"
import {
  biuSets,
  chatMessages,
  muxVideos,
  posts,
  riuSets,
  riuSubmissions,
  rius,
  siuSets,
  trickElementAssignments,
  trickElements,
  tricks,
  trickVideos,
  userLocations,
  users,
  utvVideos,
} from "~/db/schema"
import {
  isRosterPrivate,
  msUntilNextRotation,
  RIU_STATUSES,
} from "~/lib/games/rius/lifecycle"
import { calculateRiderRankings } from "~/lib/games/rius/ranking"
import { ttlCache } from "~/lib/ttl-cache"

const rider = { id: users.id, name: users.name, avatarId: users.avatarId }

// An upcoming round's sets are private until the round starts, so only rounds
// with a public roster may put a video on the home page.
const PUBLIC_ROUND_STATUSES = RIU_STATUSES.filter(
  (status) => !isRosterPrivate(status),
)

// A video only counts once Mux has finished processing it.
const videoReady = isNotNull(muxVideos.playbackId)

const PODIUM_SIZE = 3
const TRICK_ELEMENT_LIMIT = 2
const ROTATION_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

// When the active round went public: the latest Monday 00:00 UTC rotation.
function activeRoundReveal(now: Date) {
  return new Date(now.getTime() + msUntilNextRotation(now) - ROTATION_PERIOD_MS)
}

// A set is posted while its round is still private, so an active round's set
// is dated from the round's reveal rather than from when it was posted.
async function newestRiuSet(now: Date) {
  const [row] = await db
    .select({
      id: riuSets.id,
      title: riuSets.name,
      createdAt: riuSets.createdAt,
      status: rius.status,
      playbackId: muxVideos.playbackId,
      user: rider,
    })
    .from(riuSets)
    .innerJoin(rius, eq(riuSets.riuId, rius.id))
    .innerJoin(muxVideos, eq(riuSets.muxAssetId, muxVideos.assetId))
    .innerJoin(users, eq(riuSets.userId, users.id))
    .where(and(inArray(rius.status, PUBLIC_ROUND_STATUSES), videoReady))
    .orderBy(desc(riuSets.createdAt))
    .limit(1)
  if (!row) return null
  const { status, ...set } = row
  return {
    kind: "riuSet" as const,
    ...set,
    createdAt: status === "active" ? activeRoundReveal(now) : set.createdAt,
  }
}

async function newestRiuSubmission() {
  const [row] = await db
    .select({
      id: riuSubmissions.id,
      title: riuSets.name,
      createdAt: riuSubmissions.createdAt,
      playbackId: muxVideos.playbackId,
      user: rider,
    })
    .from(riuSubmissions)
    .innerJoin(riuSets, eq(riuSubmissions.riuSetId, riuSets.id))
    .innerJoin(rius, eq(riuSets.riuId, rius.id))
    .innerJoin(muxVideos, eq(riuSubmissions.muxAssetId, muxVideos.assetId))
    .innerJoin(users, eq(riuSubmissions.userId, users.id))
    .where(and(inArray(rius.status, PUBLIC_ROUND_STATUSES), videoReady))
    .orderBy(desc(riuSubmissions.createdAt))
    .limit(1)
  return row ? { kind: "riuSubmission" as const, ...row } : null
}

async function newestBiuSet() {
  const [row] = await db
    .select({
      id: biuSets.id,
      title: biuSets.name,
      createdAt: biuSets.createdAt,
      playbackId: muxVideos.playbackId,
      user: rider,
    })
    .from(biuSets)
    .innerJoin(muxVideos, eq(biuSets.muxAssetId, muxVideos.assetId))
    .innerJoin(users, eq(biuSets.userId, users.id))
    .where(and(isNull(biuSets.deletedAt), videoReady))
    .orderBy(desc(biuSets.createdAt))
    .limit(1)
  return row ? { kind: "biuSet" as const, ...row } : null
}

async function newestSiuSet() {
  const [row] = await db
    .select({
      id: siuSets.id,
      title: siuSets.name,
      createdAt: siuSets.createdAt,
      playbackId: muxVideos.playbackId,
      user: rider,
    })
    .from(siuSets)
    .innerJoin(muxVideos, eq(siuSets.muxAssetId, muxVideos.assetId))
    .innerJoin(users, eq(siuSets.userId, users.id))
    .where(and(isNull(siuSets.deletedAt), videoReady))
    .orderBy(desc(siuSets.createdAt))
    .limit(1)
  return row ? { kind: "siuSet" as const, ...row } : null
}

// Only approved trick videos are public; the tile links to the trick itself.
async function newestTrickVideo() {
  const [row] = await db
    .select({
      id: tricks.id,
      title: tricks.name,
      createdAt: trickVideos.createdAt,
      playbackId: muxVideos.playbackId,
      user: rider,
    })
    .from(trickVideos)
    .innerJoin(tricks, eq(trickVideos.trickId, tricks.id))
    .innerJoin(muxVideos, eq(trickVideos.muxAssetId, muxVideos.assetId))
    .innerJoin(users, eq(trickVideos.submittedByUserId, users.id))
    .where(and(eq(trickVideos.status, "active"), videoReady))
    .orderBy(desc(trickVideos.createdAt))
    .limit(1)
  return row ? { kind: "trickVideo" as const, ...row } : null
}

async function newestRiderVideo(now: Date) {
  const candidates = await Promise.all([
    newestRiuSet(now),
    newestRiuSubmission(),
    newestBiuSet(),
    newestSiuSet(),
    newestTrickVideo(),
  ])
  let newest: (typeof candidates)[number] = null
  for (const candidate of candidates) {
    if (!candidate) continue
    if (!newest || candidate.createdAt > newest.createdAt) newest = candidate
  }
  return newest
}

// Today's clip for the vault slot, plus the next one along in case the lead
// needs a clip of its own.
async function vaultClips(now: Date) {
  const [total] = await db
    .select({ value: count() })
    .from(utvVideos)
    .innerJoin(muxVideos, eq(utvVideos.muxAssetId, muxVideos.assetId))
    .where(videoReady)
  const size = total?.value ?? 0
  if (size === 0) return []

  const offsets =
    size > 1 ? [archiveIndex(now, size), archiveIndex(now, size, 1)] : [0]
  const rows = await Promise.all(
    offsets.map((offset) =>
      db
        .select({
          id: utvVideos.id,
          title: utvVideos.title,
          legacyTitle: utvVideos.legacyTitle,
          playbackId: muxVideos.playbackId,
          time: utvVideos.thumbnailSeconds,
          scale: utvVideos.thumbnailScale,
        })
        .from(utvVideos)
        .innerJoin(muxVideos, eq(utvVideos.muxAssetId, muxVideos.assetId))
        .where(videoReady)
        .orderBy(asc(utvVideos.id))
        .limit(1)
        .offset(offset),
    ),
  )
  return rows.flat().map(({ legacyTitle, ...clip }) => ({
    ...clip,
    title: clip.title || legacyTitle,
  }))
}

// The top of the active round. There is no active round between rotations, or
// before the first one, and that is an ordinary state here rather than an error.
async function podium() {
  const active = await db.query.rius.findFirst({
    where: eq(rius.status, "active"),
    columns: { id: true },
    with: {
      sets: {
        columns: { id: true, createdAt: true },
        with: {
          user: { columns: { id: true, name: true, avatarId: true } },
          submissions: {
            columns: { id: true, createdAt: true },
            with: {
              user: { columns: { id: true, name: true, avatarId: true } },
            },
          },
        },
      },
    },
  })
  if (!active) return null

  const leaders = calculateRiderRankings(active.sets)
    .slice(0, PODIUM_SIZE)
    .map((score) => score.user)
  return leaders.length > 0 ? { leaders } : null
}

function riderQuery() {
  return db
    .select({
      ...rider,
      createdAt: users.createdAt,
      place: userLocations.label,
    })
    .from(users)
    .leftJoin(userLocations, eq(userLocations.userId, users.id))
}

async function newestRider() {
  const [row] = await riderQuery()
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(1)
  return row ?? null
}

// Today's rider from the roster. Riders with a picture come first: the slot is
// mostly an avatar.
async function rosterRider(now: Date) {
  const hasAvatar = isNotNull(users.avatarId)
  const [withAvatar] = await db
    .select({ value: count() })
    .from(users)
    .where(hasAvatar)
  const pictured = withAvatar?.value ?? 0
  if (pictured > 0) {
    const [row] = await riderQuery()
      .where(hasAvatar)
      .orderBy(asc(users.id))
      .limit(1)
      .offset(archiveIndex(now, pictured))
    return row ?? null
  }

  const [all] = await db.select({ value: count() }).from(users)
  const size = all?.value ?? 0
  if (size === 0) return null
  const [row] = await riderQuery()
    .orderBy(asc(users.id))
    .limit(1)
    .offset(archiveIndex(now, size))
  return row ?? null
}

const trickColumns = {
  id: tricks.id,
  name: tricks.name,
  createdAt: tricks.createdAt,
}

async function newestTrick() {
  const [row] = await db
    .select(trickColumns)
    .from(tricks)
    .orderBy(desc(tricks.createdAt), desc(tricks.id))
    .limit(1)
  return row ?? null
}

async function catalogueTrick(now: Date) {
  const [total] = await db.select({ value: count() }).from(tricks)
  const size = total?.value ?? 0
  if (size === 0) return null
  const [row] = await db
    .select(trickColumns)
    .from(tricks)
    .orderBy(asc(tricks.id))
    .limit(1)
    .offset(archiveIndex(now, size))
  return row ?? null
}

async function trickElementNames(trickId: number) {
  const rows = await db
    .select({ name: trickElements.name })
    .from(trickElementAssignments)
    .innerJoin(
      trickElements,
      eq(trickElementAssignments.elementId, trickElements.id),
    )
    .where(eq(trickElementAssignments.trickId, trickId))
    .orderBy(asc(trickElements.name))
    .limit(TRICK_ELEMENT_LIMIT)
  return rows.map((row) => row.name)
}

async function newestPost() {
  const [row] = await db
    .select({ id: posts.id, title: posts.title, user: rider })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(1)
  return row ?? null
}

async function lastChatMessage() {
  const [row] = await db
    .select({
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
      user: rider,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.userId, users.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(1)
  return row ?? null
}

// One item per slot. Timestamps are consulted by the slot rules and then
// dropped: the result carries nothing the page could render as an age.
export async function computeHomeLatest(now: Date = new Date()) {
  const [
    newestVideo,
    clips,
    games,
    newRider,
    roster,
    post,
    lastMessage,
    newTrick,
    catalogue,
  ] = await Promise.all([
    newestRiderVideo(now),
    vaultClips(now),
    podium(),
    newestRider(),
    rosterRider(now),
    newestPost(),
    lastChatMessage(),
    newestTrick(),
    catalogueTrick(now),
  ])

  const [vaultClip, spareClip] = clips
  const leadChoice = chooseLead({
    newestVideo,
    vaultClip: spareClip ?? vaultClip ?? null,
    now,
  })
  // With a single clip in the vault and the lead already showing it, the vault
  // slot stands empty rather than repeating it.
  const leadTookOnlyClip = leadChoice?.source === "vault" && !spareClip

  const riderChoice = chooseNewOrArchive({
    newest: newRider,
    archivePick: roster,
    now,
  })
  const trickChoice = chooseNewOrArchive({
    newest: newTrick,
    archivePick: catalogue,
    now,
  })
  const talkChoice = chooseTalk({ lastMessage, now })

  return {
    lead: toLead(leadChoice),
    games,
    rider: riderChoice && {
      isNew: riderChoice.isNew,
      user: {
        id: riderChoice.item.id,
        name: riderChoice.item.name,
        avatarId: riderChoice.item.avatarId,
      },
      place: riderChoice.item.place,
    },
    post,
    talk:
      talkChoice.kind === "chat"
        ? {
            kind: "chat" as const,
            content: talkChoice.message.content,
            user: talkChoice.message.user,
          }
        : { kind: "arcade" as const },
    trick: trickChoice && {
      isNew: trickChoice.isNew,
      id: trickChoice.item.id,
      name: trickChoice.item.name,
      elements: await trickElementNames(trickChoice.item.id),
    },
    vault: vaultClip && !leadTookOnlyClip ? vaultClip : null,
  }
}

function toLead(
  choice: ReturnType<
    typeof chooseLead<
      NonNullable<Awaited<ReturnType<typeof newestRiderVideo>>>,
      Awaited<ReturnType<typeof vaultClips>>[number]
    >
  >,
) {
  if (!choice) return null
  if (choice.source === "vault") {
    return { kind: "vault" as const, user: null, ...choice.item }
  }
  const { createdAt: _createdAt, ...video } = choice.item
  return { ...video, time: 0, scale: 1 }
}

export type HomeLatest = Awaited<ReturnType<typeof computeHomeLatest>>

const HOME_TTL_MS = 60 * 1000

const homeCache = ttlCache(() => computeHomeLatest(), HOME_TTL_MS)

export async function getHomeLatest() {
  return homeCache.get()
}

/** test-only: reset the cache */
export function clearHomeCache() {
  homeCache.clear()
}
