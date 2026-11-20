import "@tanstack/react-start/server-only"
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm"

import { db } from "~/db"
import {
  biuSets,
  chatMessages,
  muxVideos,
  posts,
  riuSets,
  rius,
  users,
} from "~/db/schema"

// How many chat messages, posts and hero sets the board shows.
const TEASER_COUNT = 3

type HeroSet = { id: number; name: string; rider: string }

// The big panel on the home board. Every hero has a video, so the panel is
// never an empty box.
export type HomeHero =
  | { kind: "riu"; riuId: number; playbackId: string; sets: HeroSet[] }
  | {
      kind: "biu"
      biuId: number
      playbackId: string
      rider: string
      trick: string
    }
  | { kind: "lastRiu"; riuId: number; playbackId: string; sets: HeroSet[] }

// The newest round with this status that has a set with a ready video.
async function riuRound(status: "active" | "archived") {
  const [lead] = await db
    .select({ playbackId: muxVideos.playbackId, riuId: riuSets.riuId })
    .from(riuSets)
    .innerJoin(rius, eq(riuSets.riuId, rius.id))
    .innerJoin(muxVideos, eq(riuSets.muxAssetId, muxVideos.assetId))
    .where(and(eq(rius.status, status), isNotNull(muxVideos.playbackId)))
    .orderBy(desc(rius.createdAt), desc(rius.id), asc(riuSets.id))
    .limit(1)
  if (!lead?.playbackId) return null

  const sets = await db
    .select({ id: riuSets.id, name: riuSets.name, rider: users.name })
    .from(riuSets)
    .innerJoin(users, eq(riuSets.userId, users.id))
    .where(eq(riuSets.riuId, lead.riuId))
    .orderBy(asc(riuSets.id))
    .limit(TEASER_COUNT)

  return { playbackId: lead.playbackId, riuId: lead.riuId, sets }
}

// The newest back it up trick that is still the last set of its chain, so
// a rider can back it up now.
async function biuTrick() {
  const [head] = await db
    .select({
      biuId: biuSets.biuId,
      playbackId: muxVideos.playbackId,
      rider: users.name,
      trick: biuSets.name,
    })
    .from(biuSets)
    .innerJoin(users, eq(biuSets.userId, users.id))
    .innerJoin(muxVideos, eq(biuSets.muxAssetId, muxVideos.assetId))
    .where(
      and(
        isNull(biuSets.deletedAt),
        isNotNull(muxVideos.playbackId),
        sql`${biuSets.position} = (
          SELECT max(chain.position) FROM biu_sets chain
          WHERE chain.biu_id = ${biuSets.biuId}
        )`,
      ),
    )
    .orderBy(desc(biuSets.createdAt), desc(biuSets.id))
    .limit(1)
  if (!head?.playbackId) return null
  return { ...head, playbackId: head.playbackId }
}

// The hero shows the first thing a rider can act on: this week's rack it up
// sets, then the newest back it up trick, then the last finished round.
// Null when nothing has a video. The board then has no hero.
export async function getHomeHero(): Promise<HomeHero | null> {
  const active = await riuRound("active")
  if (active) return { kind: "riu", ...active }

  const trick = await biuTrick()
  if (trick) return { kind: "biu", ...trick }

  const last = await riuRound("archived")
  if (last) return { kind: "lastRiu", ...last }

  return null
}

async function latestChat() {
  const rows = await db
    .select({
      content: chatMessages.content,
      id: chatMessages.id,
      user: { avatarId: users.avatarId, name: users.name },
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.userId, users.id))
    .orderBy(desc(chatMessages.id))
    .limit(TEASER_COUNT)
  // Oldest first, as the chat page shows them.
  return rows.toReversed()
}

function latestPosts() {
  return db
    .select({ content: posts.content, id: posts.id, title: posts.title })
    .from(posts)
    .orderBy(desc(posts.id))
    .limit(TEASER_COUNT)
}

// Everything the home board shows, in one small read. It has no counts and
// no times: the board must not show how quiet the site is.
export async function getHomeBoard() {
  const [hero, chat, latest] = await Promise.all([
    getHomeHero(),
    latestChat(),
    latestPosts(),
  ])
  return { chat, hero, posts: latest }
}
