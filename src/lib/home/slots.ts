// The home page's slot rules, expressed once.
//
// The home page is a fixed set of slots, one per section, and every slot is
// always filled. A slot shows the newest thing in its section while that thing
// is fresh; once it goes stale the slot is filled from the archive instead (a
// vault clip, a rider from the roster, a trick from the catalogue), so a quiet
// week looks the same as a busy one. Nothing here is ever rendered as a time:
// the page shows no clocks and no counts, and these rules are the only place a
// timestamp is consulted.
//
// This module is deliberately dependency-free so the rules can be unit tested
// without a database. The queries that feed it live in `ops.server.ts`.

export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000

type Dated = { createdAt: Date }

export function isFresh(item: Dated | null | undefined, now: Date): boolean {
  if (!item) return false
  return now.getTime() - item.createdAt.getTime() < STALE_AFTER_MS
}

// A stable position in the archive for "today". Archive-filled slots turn over
// once a day and show the same thing to every visitor.
export function archiveIndex(now: Date, size: number, offset = 0): number {
  if (size <= 0) return 0
  return (Math.floor(now.getTime() / DAY_MS) + offset) % size
}

export type LeadChoice<TVideo, TClip> =
  | { source: "latest"; item: TVideo }
  | { source: "vault"; item: TClip }

// The lead is the newest rider video while it is fresh. A stale one gives way
// to a vault clip; with no vault clip to show, the newest video stays up
// whatever its age rather than leaving the slot empty.
export function chooseLead<TVideo extends Dated, TClip>({
  newestVideo,
  vaultClip,
  now,
}: {
  newestVideo: TVideo | null
  vaultClip: TClip | null
  now: Date
}): LeadChoice<TVideo, TClip> | null {
  if (newestVideo && isFresh(newestVideo, now)) {
    return { source: "latest", item: newestVideo }
  }
  if (vaultClip) return { source: "vault", item: vaultClip }
  if (newestVideo) return { source: "latest", item: newestVideo }
  return null
}

export type ArchiveChoice<T> = { isNew: boolean; item: T }

// Shared by the rider and trick slots: the newest one is announced as new
// while fresh, otherwise the slot shows today's pick from the archive under a
// plain label.
export function chooseNewOrArchive<T extends Dated>({
  newest,
  archivePick,
  now,
}: {
  newest: T | null
  archivePick: T | null
  now: Date
}): ArchiveChoice<T> | null {
  if (newest && isFresh(newest, now)) return { isNew: true, item: newest }
  const item = archivePick ?? newest
  return item ? { isNew: false, item } : null
}

export type TalkChoice<TMessage> =
  | { kind: "chat"; message: TMessage }
  | { kind: "arcade" }

// A chat line only makes sense while the conversation is live. When the last
// message is stale the slot goes to the arcade instead.
export function chooseTalk<TMessage extends Dated>({
  lastMessage,
  now,
}: {
  lastMessage: TMessage | null
  now: Date
}): TalkChoice<TMessage> {
  if (lastMessage && isFresh(lastMessage, now)) {
    return { kind: "chat", message: lastMessage }
  }
  return { kind: "arcade" }
}
