import { eq, inArray } from "drizzle-orm"

import {
  muxVideos,
  posts,
  riuSets,
  tricks,
  users,
  utvVideos,
} from "~/db/schema"
import { type AskCard } from "~/lib/ask/schemas"
import { getMuxPoster } from "~/lib/mux/poster"
import { getCloudflareImageUrl } from "~/lib/utils"
import { type ToolDb } from "~/mcp/tools/define"

// Links an answer can preview.
export const MAX_LINKS = 24

type Ref = { kind: AskCard["kind"]; id: number; path: string }

const patterns: [AskCard["kind"], RegExp][] = [
  ["post", /\]\((\/posts\/(\d+))\)/g],
  ["riu set", /\]\((\/games\/rius\/sets\/(\d+))\)/g],
  ["video", /\]\((\/vault\/(\d+))\)/g],
  ["rider", /\]\((\/users\/(\d+))\)/g],
  ["trick", /\]\((\/tricks\/(\d+))\)/g],
]

// The posts, riu sets, videos, riders and tricks an answer links to, in the
// order the answer names them, without repeats.
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
    .slice(0, MAX_LINKS)
    .map(({ kind, id, path }) => ({ kind, id, path }))
}

const poster = (playbackId: string | null) =>
  getMuxPoster({ playbackId, width: 480 }) ?? null

// Long bios and descriptions are cut for the hover preview.
const DESCRIPTION_LENGTH = 160
function short(text: string | null) {
  const value = text?.trim()
  if (!value) return null
  return value.length > DESCRIPTION_LENGTH
    ? `${value.slice(0, DESCRIPTION_LENGTH - 1).trimEnd()}…`
    : value
}

// Previews for the content an answer links to. A link to something that does
// not exist gets no preview.
export async function answerCards(
  db: ToolDb,
  answer: string,
): Promise<AskCard[]> {
  const refs = cardRefs(answer)
  const ids = (kind: AskCard["kind"]) =>
    refs.filter((ref) => ref.kind === kind).map((ref) => ref.id)

  const [postRows, setRows, videoRows, riderRows, trickRows] =
    await Promise.all([
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
      ids("rider").length === 0
        ? []
        : db
            .select({
              id: users.id,
              name: users.name,
              bio: users.bio,
              avatarId: users.avatarId,
            })
            .from(users)
            .where(inArray(users.id, ids("rider"))),
      ids("trick").length === 0
        ? []
        : db
            .select({
              id: tricks.id,
              name: tricks.name,
              description: tricks.description,
            })
            .from(tricks)
            .where(inArray(tricks.id, ids("trick"))),
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
      description: null,
    })
  }
  for (const row of setRows) {
    cards.set(`/games/rius/sets/${row.id}`, {
      path: `/games/rius/sets/${row.id}`,
      kind: "riu set",
      title: row.name,
      subtitle: `riu set · ${row.author}`,
      poster: poster(row.playbackId),
      description: null,
    })
  }
  for (const row of videoRows) {
    cards.set(`/vault/${row.id}`, {
      path: `/vault/${row.id}`,
      kind: "video",
      title: row.title || row.legacyTitle,
      subtitle: "vault video",
      poster: poster(row.playbackId),
      description: null,
    })
  }
  for (const row of riderRows) {
    cards.set(`/users/${row.id}`, {
      path: `/users/${row.id}`,
      kind: "rider",
      title: row.name,
      subtitle: "rider",
      poster: row.avatarId
        ? getCloudflareImageUrl(row.avatarId, { width: 160, quality: 80 })
        : null,
      description: short(row.bio),
    })
  }
  for (const row of trickRows) {
    cards.set(`/tricks/${row.id}`, {
      path: `/tricks/${row.id}`,
      kind: "trick",
      title: row.name,
      subtitle: "trick",
      poster: null,
      description: short(row.description),
    })
  }
  return refs.flatMap(({ path }) => cards.get(path) ?? [])
}
