import { eq, inArray } from "drizzle-orm"

import { muxVideos, posts, riuSets, users, utvVideos } from "~/db/schema"
import { type AskCard } from "~/lib/ask/schemas"
import { getMuxPoster } from "~/lib/mux/poster"
import { getCloudflareImageUrl } from "~/lib/utils"
import { type ToolDb } from "~/mcp/tools/define"

export const MAX_CARDS = 4

type Ref = { kind: AskCard["kind"]; id: number; path: string }

const patterns: [AskCard["kind"], RegExp][] = [
  ["post", /\]\((\/posts\/(\d+))\)/g],
  ["riu set", /\]\((\/games\/rius\/sets\/(\d+))\)/g],
  ["video", /\]\((\/vault\/(\d+))\)/g],
]

// The posts, riu sets and vault videos an answer links to, in the order the
// answer names them, without repeats.
export function cardRefs(answer: string): Ref[] {
  const found: (Ref & { at: number })[] = []
  for (const [kind, pattern] of patterns) {
    for (const match of answer.matchAll(pattern)) {
      found.push({
        kind,
        path: match[1],
        id: Number(match[2]),
        at: match.index,
      })
    }
  }
  const seen = new Set<string>()
  return found
    .toSorted((a, b) => a.at - b.at)
    .filter(({ path }) => !seen.has(path) && Boolean(seen.add(path)))
    .slice(0, MAX_CARDS)
    .map(({ kind, id, path }) => ({ kind, id, path }))
}

const poster = (playbackId: string | null) =>
  getMuxPoster({ playbackId, width: 480 }) ?? null

// Cards for the content an answer links to. A link to something that does
// not exist gets no card.
export async function answerCards(
  db: ToolDb,
  answer: string,
): Promise<AskCard[]> {
  const refs = cardRefs(answer)
  const ids = (kind: AskCard["kind"]) =>
    refs.filter((ref) => ref.kind === kind).map((ref) => ref.id)

  const [postRows, setRows, videoRows] = await Promise.all([
    ids("post").length === 0
      ? []
      : db
          .select({
            id: posts.id,
            title: posts.title,
            author: users.name,
            imageId: posts.imageId,
            playbackId: muxVideos.playbackId,
          })
          .from(posts)
          .innerJoin(users, eq(users.id, posts.userId))
          .leftJoin(muxVideos, eq(muxVideos.assetId, posts.muxAssetId))
          .where(inArray(posts.id, ids("post"))),
    ids("riu set").length === 0
      ? []
      : db
          .select({
            id: riuSets.id,
            name: riuSets.name,
            author: users.name,
            playbackId: muxVideos.playbackId,
          })
          .from(riuSets)
          .innerJoin(users, eq(users.id, riuSets.userId))
          .leftJoin(muxVideos, eq(muxVideos.assetId, riuSets.muxAssetId))
          .where(inArray(riuSets.id, ids("riu set"))),
    ids("video").length === 0
      ? []
      : db
          .select({
            id: utvVideos.id,
            title: utvVideos.title,
            legacyTitle: utvVideos.legacyTitle,
            playbackId: muxVideos.playbackId,
          })
          .from(utvVideos)
          .leftJoin(muxVideos, eq(muxVideos.assetId, utvVideos.muxAssetId))
          .where(inArray(utvVideos.id, ids("video"))),
  ])

  const cards = new Map<string, AskCard>()
  for (const row of postRows) {
    const image = row.imageId
      ? getCloudflareImageUrl(row.imageId, { width: 480, quality: 80 })
      : null
    cards.set(`/posts/${row.id}`, {
      path: `/posts/${row.id}`,
      kind: "post",
      title: row.title,
      subtitle: `post · ${row.author}`,
      poster: poster(row.playbackId) ?? image,
    })
  }
  for (const row of setRows) {
    cards.set(`/games/rius/sets/${row.id}`, {
      path: `/games/rius/sets/${row.id}`,
      kind: "riu set",
      title: row.name,
      subtitle: `riu set · ${row.author}`,
      poster: poster(row.playbackId),
    })
  }
  for (const row of videoRows) {
    cards.set(`/vault/${row.id}`, {
      path: `/vault/${row.id}`,
      kind: "video",
      title: row.title || row.legacyTitle,
      subtitle: "vault video",
      poster: poster(row.playbackId),
    })
  }
  return refs.flatMap(({ path }) => cards.get(path) ?? [])
}
