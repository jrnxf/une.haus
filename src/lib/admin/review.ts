import {
  type GlossaryProposalDiff,
  type TrickSuggestionDiff,
  type UtvVideoSuggestionDiff,
} from "~/db/schema"

/**
 * One row of a review card. A row with no change (`before === after`, or a
 * list with only `kept` items) shows a plain value. A row with a change shows
 * the old value next to the new one.
 */
export type ReviewField =
  | {
      kind: "text"
      label: string
      before: string | null
      after: string | null
      href?: string
    }
  | {
      kind: "list"
      label: string
      kept: string[]
      added: string[]
      removed: string[]
    }

type Scalar = string | number | null | undefined

function toText(value: Scalar): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function isField(field: ReviewField | null): field is ReviewField {
  return field !== null
}

/** A value with no change. Null when the value is empty. */
export function plainText(
  label: string,
  value: Scalar,
  href?: string,
): ReviewField | null {
  const text = toText(value)
  if (text === null) return null
  return { kind: "text", label, before: text, after: text, href }
}

/** A list with no change. Null when the list is empty. */
export function plainList(label: string, items: string[]): ReviewField | null {
  if (items.length === 0) return null
  return { kind: "list", label, kept: items, added: [], removed: [] }
}

/** Null when the two values are the same. An empty string counts as null. */
export function textChange(
  label: string,
  before: Scalar,
  after: Scalar,
): ReviewField | null {
  const from = toText(before)
  const to = toText(after)
  if (from === to) return null
  return { kind: "text", label, before: from, after: to }
}

/** Null when the two lists hold the same items. Order does not count. */
export function listChange(
  label: string,
  before: string[],
  after: string[],
): ReviewField | null {
  const added = after.filter((item) => !before.includes(item))
  const removed = before.filter((item) => !after.includes(item))
  if (added.length === 0 && removed.length === 0) return null
  const kept = before.filter((item) => after.includes(item))
  return { kind: "list", label, kept, added, removed }
}

function relationshipLabel(type: string, name: string | null, id: number) {
  return `${type.replaceAll("_", " ")}: ${name ?? `#${id}`}`
}

/** The two JSON documents for the raw diff view of a card. */
function buildJsonDiff(current: unknown, proposed: unknown) {
  return {
    original: JSON.stringify(current, null, 2),
    modified: JSON.stringify(proposed, null, 2),
  }
}

// ==================== Trick submission ====================

type SubmissionInput = {
  name: string
  alternateNames: string[] | null
  description: string | null
  inventedBy: string | null
  yearLanded: number | null
  notes: string | null
  videoUrl: string | null
  videoTimestamp: string | null
  elementAssignments: { element: { name: string } }[]
  relationships: { type: string; targetTrick: { id: number; name: string } }[]
}

export function submissionReview(s: SubmissionInput) {
  const fields = [
    plainList("alternate names", s.alternateNames ?? []),
    plainText("description", s.description),
    plainText("invented by", s.inventedBy),
    plainText("year landed", s.yearLanded),
    plainText("notes", s.notes),
    plainList(
      "elements",
      s.elementAssignments.map((a) => a.element.name),
    ),
    plainList(
      "relationships",
      s.relationships.map((r) =>
        relationshipLabel(r.type, r.targetTrick.name, r.targetTrick.id),
      ),
    ),
    plainText("video", s.videoUrl, s.videoUrl ?? undefined),
    plainText("video timestamp", s.videoTimestamp),
  ].filter(isField)

  const raw = JSON.stringify(
    {
      name: s.name,
      alternateNames: s.alternateNames ?? [],
      description: s.description ?? null,
      inventedBy: s.inventedBy ?? null,
      yearLanded: s.yearLanded ?? null,
      notes: s.notes ?? null,
      videoUrl: s.videoUrl ?? null,
      videoTimestamp: s.videoTimestamp ?? null,
      elements: s.elementAssignments.map((a) => a.element.name),
      relationships: s.relationships.map((r) => ({
        targetId: r.targetTrick.id,
        type: r.type,
      })),
    },
    null,
    2,
  )

  return { fields, raw }
}

// ==================== Trick suggestion ====================

type SuggestionTrickInput = {
  name: string
  alternateNames: string[] | null
  description: string | null
  inventedBy: string | null
  yearLanded: number | null
  notes: string | null
  elementAssignments?: { element: { name: string } }[]
  outgoingRelationships?: {
    type: string
    targetTrick: { id: number; name: string }
  }[]
}

type RelationshipTarget = { id: number; type: string; name: string | null }

function sameRelationship(
  a: { targetId: number; type: string },
  b: { targetId: number; type: string },
) {
  return a.targetId === b.targetId && a.type === b.type
}

export function trickSuggestionReview(
  trick: SuggestionTrickInput,
  diff: TrickSuggestionDiff,
  addedTargets: RelationshipTarget[],
) {
  const relationships = (trick.outgoingRelationships ?? []).map((r) => ({
    targetId: r.targetTrick.id,
    type: r.type,
    label: relationshipLabel(r.type, r.targetTrick.name, r.targetTrick.id),
  }))
  const removed = diff.relationships?.removed ?? []
  const added = (diff.relationships?.added ?? []).map((r) => ({
    ...r,
    label: relationshipLabel(
      r.type,
      addedTargets.find((t) => t.id === r.targetId && t.type === r.type)
        ?.name ?? null,
      r.targetId,
    ),
  }))
  const proposedRelationships = [
    ...relationships.filter(
      (r) => !removed.some((x) => sameRelationship(x, r)),
    ),
    ...added,
  ]

  const elements = (trick.elementAssignments ?? []).map((a) => a.element.name)
  const alternateNames = trick.alternateNames ?? []

  const fields = [
    diff.name === undefined ? null : textChange("name", trick.name, diff.name),
    diff.alternateNames === undefined
      ? null
      : listChange("alternate names", alternateNames, diff.alternateNames),
    diff.description === undefined
      ? null
      : textChange("description", trick.description, diff.description),
    diff.inventedBy === undefined
      ? null
      : textChange("invented by", trick.inventedBy, diff.inventedBy),
    diff.yearLanded === undefined
      ? null
      : textChange("year landed", trick.yearLanded, diff.yearLanded),
    diff.notes === undefined
      ? null
      : textChange("notes", trick.notes, diff.notes),
    diff.elements === undefined
      ? null
      : listChange("elements", elements, diff.elements),
    diff.relationships === undefined
      ? null
      : listChange(
          "relationships",
          relationships.map((r) => r.label),
          proposedRelationships.map((r) => r.label),
        ),
    // The trick row holds no video, so a video in a diff is always new.
    diff.videoUrl === undefined
      ? null
      : textChange("video", null, diff.videoUrl),
    diff.videoTimestamp === undefined
      ? null
      : textChange("video timestamp", null, diff.videoTimestamp),
  ].filter(isField)

  const current = {
    name: trick.name,
    alternateNames,
    description: trick.description ?? null,
    inventedBy: trick.inventedBy ?? null,
    yearLanded: trick.yearLanded ?? null,
    notes: trick.notes ?? null,
    elements,
    relationships: relationships.map(({ targetId, type }) => ({
      targetId,
      type,
    })),
  }
  const proposed = {
    ...current,
    ...(diff.name !== undefined && { name: diff.name }),
    ...(diff.alternateNames !== undefined && {
      alternateNames: diff.alternateNames,
    }),
    ...(diff.description !== undefined && { description: diff.description }),
    ...(diff.inventedBy !== undefined && { inventedBy: diff.inventedBy }),
    ...(diff.yearLanded !== undefined && { yearLanded: diff.yearLanded }),
    ...(diff.notes !== undefined && { notes: diff.notes }),
    ...(diff.elements !== undefined && { elements: diff.elements }),
    ...(diff.relationships !== undefined && {
      relationships: proposedRelationships.map(({ targetId, type }) => ({
        targetId,
        type,
      })),
    }),
    ...(diff.videoUrl !== undefined && { videoUrl: diff.videoUrl }),
    ...(diff.videoTimestamp !== undefined && {
      videoTimestamp: diff.videoTimestamp,
    }),
  }

  return { fields, raw: buildJsonDiff(current, proposed) }
}

// ==================== Glossary proposal ====================

type GlossaryTarget = { name: string; description: string | null } | undefined

export function glossaryEditReview(
  target: GlossaryTarget,
  diff: GlossaryProposalDiff,
) {
  const current = {
    name: target?.name ?? null,
    description: target?.description ?? null,
  }
  const proposed = {
    ...current,
    ...(diff.name !== undefined && { name: diff.name }),
    ...(diff.description !== undefined && { description: diff.description }),
  }
  const fields = [
    textChange("name", current.name, proposed.name),
    textChange("description", current.description, proposed.description),
  ].filter(isField)

  return { fields, raw: buildJsonDiff(current, proposed) }
}

// ==================== Vault suggestion ====================

type VaultVideoInput = {
  title: string | null
  legacyTitle: string | null
  disciplines: string[] | null
  riders?: {
    userId: number | null
    name: string | null
    user?: { name: string } | null
  }[]
}

function riderLabel(rider: { userId: number | null; name: string | null }) {
  return rider.name ?? (rider.userId === null ? "unknown" : `#${rider.userId}`)
}

export function vaultSuggestionReview(
  video: VaultVideoInput,
  diff: UtvVideoSuggestionDiff,
) {
  const current = {
    title: video.title || video.legacyTitle,
    disciplines: video.disciplines ?? null,
    riders: (video.riders ?? []).map((r) => ({
      userId: r.userId,
      name: r.user?.name ?? r.name,
    })),
  }
  const proposed = {
    ...current,
    ...(diff.title !== undefined && { title: diff.title }),
    ...(diff.disciplines !== undefined && { disciplines: diff.disciplines }),
    ...(diff.riders !== undefined && { riders: diff.riders }),
  }
  const fields = [
    textChange("title", current.title, proposed.title),
    listChange(
      "disciplines",
      current.disciplines ?? [],
      proposed.disciplines ?? [],
    ),
    listChange(
      "riders",
      current.riders.map(riderLabel),
      proposed.riders.map(riderLabel),
    ),
  ].filter(isField)

  return { fields, raw: buildJsonDiff(current, proposed) }
}

// ==================== Queue ====================

const REVIEW_KINDS = [
  "submission",
  "suggestion",
  "video",
  "glossary",
  "vault",
  "flag",
] as const

export type ReviewKind = (typeof REVIEW_KINDS)[number]

export const REVIEW_KIND_FILTER_LABELS: Record<ReviewKind, string> = {
  submission: "submissions",
  suggestion: "suggestions",
  video: "videos",
  glossary: "glossary",
  vault: "vault",
  flag: "flags",
}

/** Oldest first, so the item that waited longest is at the top. */
export function sortQueue<T extends { createdAt: Date | string | number }>(
  items: T[],
): T[] {
  return items.toSorted(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

/** The kinds that have items, in display order, each with its count. */
export function countKinds(items: { kind: ReviewKind }[]) {
  return REVIEW_KINDS.map((kind) => ({
    kind,
    count: items.filter((item) => item.kind === kind).length,
  })).filter((entry) => entry.count > 0)
}
