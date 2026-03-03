import {
  type NeighborLink,
  type Trick,
  type TrickModifiers,
  type TricksData,
} from "./types"

// Element display order (most common/important first)
const ELEMENT_ORDER = [
  "spin",
  "flip",
  "wrap",
  "twist",
  "roll",
  "grind",
  "varial",
  "coast",
  "walk",
  "rev",
  "mount",
  "basic",
  "wild",
  "whip",
  "jam",
  "grab",
  "glide",
  "balance",
  "ride",
  "handstepover",
  "stepover",
  "plant",
  "combo",
  "position",
  "pirouette",
  "footjam",
  "crownjam",
  "toetwist",
  "pedal push",
  "bc wheel",
]

// Progression word order for sorting (single flip < double < triple...)
const PROGRESSION_ORDER = [
  "half",
  "crank",
  "single",
  "",
  "1.5",
  "double",
  "2.5",
  "triple",
  "3.5",
  "quad",
  "4.5",
  "quint",
  "5.5",
  "sext",
]

export function getTrickSortKey(name: string): {
  leadingNumber: number
  baseWords: string
  progressionRank: number
  suffix: string
} {
  const lower = name.toLowerCase()

  const leadingMatch = lower.match(/^(\d+(?:\.\d+)?)/)
  const leadingNumber = leadingMatch ? Number.parseFloat(leadingMatch[1]) : 0

  const rest = leadingMatch ? lower.slice(leadingMatch[0].length).trim() : lower

  let progressionRank = PROGRESSION_ORDER.indexOf("")
  let progressionWord = ""

  for (const [index, prog] of PROGRESSION_ORDER.entries()) {
    if (prog && rest.includes(prog)) {
      const progPattern = new RegExp(`\\b${prog}\\b`)
      if (progPattern.test(rest)) {
        progressionRank = index
        progressionWord = prog
        break
      }
    }
  }

  const baseWords = rest
    .replace(new RegExp(`\\b${progressionWord}\\b`), "")
    .replaceAll(/\s+/g, " ")
    .trim()

  const trailingMatch = rest.match(/(\d+)$/)
  const suffix = trailingMatch ? trailingMatch[1] : ""

  return { leadingNumber, baseWords, progressionRank, suffix }
}

export function compareTrickNames(a: string, b: string): number {
  const keyA = getTrickSortKey(a)
  const keyB = getTrickSortKey(b)

  const baseCompare = keyA.baseWords.localeCompare(keyB.baseWords)
  if (baseCompare !== 0) return baseCompare

  if (keyA.leadingNumber !== keyB.leadingNumber) {
    return keyA.leadingNumber - keyB.leadingNumber
  }

  if (keyA.progressionRank !== keyB.progressionRank) {
    return keyA.progressionRank - keyB.progressionRank
  }

  return keyA.suffix.localeCompare(keyB.suffix)
}

export function computeDepthsAndDependents(tricks: Trick[]): void {
  const byId = new Map(tricks.map((t) => [t.id, t]))

  // Reset all depths and dependents
  for (const t of tricks) {
    t.depth = -1
    t.dependents = []
  }

  // Build dependents lists (reverse of prerequisites and optional prerequisites)
  for (const t of tricks) {
    if (t.prerequisite) {
      const prereq = byId.get(t.prerequisite)
      if (prereq) {
        prereq.dependents.push(t.id)
      }
    }
    if (t.optionalPrerequisite) {
      const optPrereq = byId.get(t.optionalPrerequisite)
      if (optPrereq) {
        optPrereq.dependents.push(t.id)
      }
    }
  }

  // Find roots (no prerequisite or prerequisite not in data)
  const roots = tricks.filter(
    (t) => !t.prerequisite || !byId.has(t.prerequisite),
  )
  for (const t of roots) t.depth = 0

  // BFS to compute depths
  const queue = [...roots]

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const depId of current.dependents) {
      const dep = byId.get(depId)
      if (dep && dep.depth === -1) {
        dep.depth = current.depth + 1
        queue.push(dep)
      }
    }
  }

  // Handle any remaining tricks (cycles or disconnected)
  for (const t of tricks.filter((t) => t.depth === -1)) t.depth = 0
}

// ==================== COMPUTED NEIGHBORS ====================

const WRAPS = ["none", "side", "secretside", "backside", "antiside"]
const TIRES = ["none", "to tire", "from tire", "on tire"]

function modifierKey(m: TrickModifiers): string {
  return `${m.flips}:${m.spin}:${m.wrap}:${m.twist}:${m.fakie}:${m.tire}:${m.switchStance}:${m.late}`
}

// Generate all modifier keys that are exactly one step away from the given modifiers.
// One step = changing a single dimension by its smallest meaningful increment.
function generateNeighborKeys(m: TrickModifiers): string[] {
  const keys: string[] = []

  // Flips +-1
  keys.push(modifierKey({ ...m, flips: m.flips + 1 }))
  if (m.flips > 0) keys.push(modifierKey({ ...m, flips: m.flips - 1 }))

  // Spin +-90 and +-180
  keys.push(
    modifierKey({ ...m, spin: m.spin + 90 }),
    modifierKey({ ...m, spin: m.spin + 180 }),
  )
  if (m.spin > 0) keys.push(modifierKey({ ...m, spin: m.spin - 90 }))
  if (m.spin >= 180) keys.push(modifierKey({ ...m, spin: m.spin - 180 }))

  // Twist +-180
  keys.push(modifierKey({ ...m, twist: m.twist + 180 }))
  if (m.twist > 0) keys.push(modifierKey({ ...m, twist: m.twist - 180 }))

  // Wrap: any single change
  for (const wrap of WRAPS) {
    if (wrap !== m.wrap) keys.push(modifierKey({ ...m, wrap }))
  }

  // Tire: any single change
  for (const tire of TIRES) {
    if (tire !== m.tire) keys.push(modifierKey({ ...m, tire }))
  }

  // Boolean toggles
  keys.push(
    modifierKey({ ...m, fakie: !m.fakie }),
    modifierKey({ ...m, switchStance: !m.switchStance }),
    modifierKey({ ...m, late: !m.late }),
  )

  return keys
}

// Describe modifier changes between two tricks.
// Returns all differences joined together.
export function describeModifierDiff(
  from: TrickModifiers,
  to: TrickModifiers,
): string {
  const parts: string[] = []
  if (to.flips !== from.flips) {
    parts.push(to.flips > from.flips ? "more flips" : "less flips")
  }
  if (to.spin !== from.spin) {
    parts.push(to.spin > from.spin ? "more spins" : "less spins")
  }
  if (to.twist !== from.twist) {
    parts.push(to.twist > from.twist ? "more twists" : "less twists")
  }
  if (to.wrap !== from.wrap) {
    if (from.wrap === "none") parts.push(`add ${to.wrap}`)
    else if (to.wrap === "none") parts.push(`remove ${from.wrap}`)
    else parts.push(`add ${to.wrap}`)
  }
  if (to.tire !== from.tire) {
    if (from.tire === "none") parts.push(`add tire`)
    else if (to.tire === "none") parts.push("remove tire")
    else parts.push(`add tire`)
  }
  if (to.fakie !== from.fakie) {
    parts.push(to.fakie ? "add fakie" : "remove fakie")
  }
  if (to.switchStance !== from.switchStance) {
    parts.push(to.switchStance ? "add switch" : "remove switch")
  }
  if (to.late !== from.late) {
    parts.push(to.late ? "add late" : "remove late")
  }
  return parts.length > 0 ? parts.join(", ") : "nearby"
}

// Determine whether going from one modifier set to another "adds" or "removes" complexity.
export function modifierDirection(
  from: TrickModifiers,
  to: TrickModifiers,
): "adds" | "removes" {
  let adds = 0
  let removes = 0

  // Flips
  if (to.flips > from.flips) adds++
  else if (to.flips < from.flips) removes++

  // Spin
  if (to.spin > from.spin) adds++
  else if (to.spin < from.spin) removes++

  // Twist
  if (to.twist > from.twist) adds++
  else if (to.twist < from.twist) removes++

  // Wrap: none → something = adds, something → none = removes, lateral = adds
  if (to.wrap !== from.wrap) {
    if (from.wrap === "none") adds++
    else if (to.wrap === "none") removes++
    else adds++
  }

  // Tire: none → something = adds, something → none = removes, lateral = adds
  if (to.tire !== from.tire) {
    if (from.tire === "none") adds++
    else if (to.tire === "none") removes++
    else adds++
  }

  // Boolean toggles: true = adds, false = removes
  if (to.fakie !== from.fakie) {
    if (to.fakie) adds++
    else removes++
  }
  if (to.switchStance !== from.switchStance) {
    if (to.switchStance) adds++
    else removes++
  }
  if (to.late !== from.late) {
    if (to.late) adds++
    else removes++
  }

  return adds >= removes ? "adds" : "removes"
}

// Compute neighbors for all tricks in-place.
//
// For simple tricks:
//   - Other simple tricks differing by exactly one modifier step
//   - Compound tricks that contain this trick as a component
//
// For compound tricks:
//   - Each component trick
//   - Other compounds sharing at least one component
//   - Compounds where exactly one component is swapped for its one-step neighbor
export function computeAllNeighbors(tricks: Trick[]): void {
  const byId = new Map(tricks.map((t) => [t.id, t]))

  // Index simple tricks by modifier key for O(1) lookup
  const simpleByModifiers = new Map<string, Trick>()
  for (const t of tricks) {
    if (!t.isCompound) {
      simpleByModifiers.set(modifierKey(t.modifiers), t)
    }
  }

  // Index compound tricks by component id
  const compoundsByComponent = new Map<string, Trick[]>()
  for (const t of tricks) {
    if (!t.isCompound) continue
    for (const comp of t.compositions) {
      const list = compoundsByComponent.get(comp.componentId) ?? []
      list.push(t)
      compoundsByComponent.set(comp.componentId, list)
    }
  }

  for (const trick of tricks) {
    const neighborMap = new Map<
      string,
      { label: string; direction: "adds" | "removes" }
    >()

    if (trick.isCompound) {
      // Component tricks
      for (const comp of trick.compositions) {
        neighborMap.set(comp.componentId, {
          label: "component",
          direction: "removes",
        })
      }

      // Sibling compounds (share at least one component)
      for (const comp of trick.compositions) {
        const siblings = compoundsByComponent.get(comp.componentId) ?? []
        for (const sibling of siblings) {
          if (sibling.id !== trick.id && !neighborMap.has(sibling.id)) {
            neighborMap.set(sibling.id, {
              label: "variation",
              direction: "adds",
            })
          }
        }
      }

      // Compounds with one-step upgraded components:
      // For each component, find its modifier neighbors, then find
      // compounds that use those neighbor components at the same position.
      // Only include if exactly one component differs.
      const myComponentIds = trick.compositions
        .toSorted((a, b) => a.position - b.position)
        .map((c) => c.componentId)

      for (const comp of trick.compositions) {
        const componentTrick = byId.get(comp.componentId)
        if (!componentTrick || componentTrick.isCompound) continue

        for (const key of generateNeighborKeys(componentTrick.modifiers)) {
          const neighborComponent = simpleByModifiers.get(key)
          if (!neighborComponent || neighborComponent.id === comp.componentId) {
            continue
          }

          const neighborCompounds =
            compoundsByComponent.get(neighborComponent.id) ?? []
          for (const nc of neighborCompounds) {
            if (nc.id === trick.id || neighborMap.has(nc.id)) continue

            // Check that exactly one component differs
            const theirComponentIds = nc.compositions
              .toSorted((a, b) => a.position - b.position)
              .map((c) => c.componentId)

            if (myComponentIds.length !== theirComponentIds.length) continue

            let diffs = 0
            for (const [i, myComponentId] of myComponentIds.entries()) {
              if (myComponentId !== theirComponentIds[i]) diffs++
            }

            if (diffs === 1) {
              neighborMap.set(nc.id, {
                label: "variation",
                direction: "adds",
              })
            }
          }
        }
      }
    } else {
      // Modifier-adjacent simple tricks
      for (const key of generateNeighborKeys(trick.modifiers)) {
        const neighbor = simpleByModifiers.get(key)
        if (neighbor && neighbor.id !== trick.id) {
          neighborMap.set(neighbor.id, {
            label: describeModifierDiff(trick.modifiers, neighbor.modifiers),
            direction: modifierDirection(trick.modifiers, neighbor.modifiers),
          })
        }
      }

      // Compound tricks containing this trick as a component
      const compounds = compoundsByComponent.get(trick.id) ?? []
      for (const compound of compounds) {
        neighborMap.set(compound.id, { label: "compound", direction: "adds" })
      }
    }

    trick.neighbors = [...neighborMap.entries()].map(
      ([id, { label, direction }]): NeighborLink => ({ id, label, direction }),
    )
  }
}

// ==================== INDEXES ====================

export function buildIndexes(tricks: Trick[]): {
  byId: Record<string, Trick>
  byElement: Record<string, Trick[]>
  elements: string[]
} {
  const byId: Record<string, Trick> = {}
  const byElement: Record<string, Trick[]> = {}
  const elementSet = new Set<string>()

  for (const trick of tricks) {
    byId[trick.id] = trick

    for (const elem of trick.elements) {
      elementSet.add(elem)
      if (!byElement[elem]) {
        byElement[elem] = []
      }
      byElement[elem].push(trick)
    }
  }

  // Sort tricks within each element by depth, then by natural name order
  for (const elementTricks of Object.values(byElement)) {
    elementTricks.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth
      return compareTrickNames(a.name, b.name)
    })
  }

  // Order elements by predefined order, then alphabetically for any new ones
  const elements = [...elementSet].toSorted((a, b) => {
    const aIndex = ELEMENT_ORDER.indexOf(a)
    const bIndex = ELEMENT_ORDER.indexOf(b)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.localeCompare(b)
  })

  return { byId, byElement, elements }
}

export function buildTricksData(tricks: Trick[]): TricksData {
  computeDepthsAndDependents(tricks)
  computeAllNeighbors(tricks)
  const { byId, byElement, elements } = buildIndexes(tricks)

  return {
    tricks,
    byId,
    byElement,
    elements,
  }
}

// Type for database trick video
export type DbTrickVideo = {
  id: number
  status: "active" | "pending" | "rejected"
  sortOrder: number
  notes: string | null
  video: { playbackId: string | null } | null
}

// Type for database trick composition
export type DbTrickComposition = {
  position: number
  catchType: "one-foot" | "two-foot" | null
  componentTrick: {
    id: number
    slug: string
    name: string
  }
}

// Type for database trick with relations
export type DbTrickWithRelations = {
  id: number
  slug: string
  name: string
  alternateNames: string[] | null
  description: string | null
  isCompound: boolean
  inventedBy: string | null
  inventedByUserId: number | null
  yearLanded: number | null
  notes: string | null
  referenceVideoUrl: string | null
  referenceVideoTimestamp: string | null
  flips: number
  spin: number
  wrap: string
  twist: number
  fakie: boolean
  tire: string
  switchStance: boolean
  late: boolean
  depth: number
  dependentSlugs: string[]
  neighborLinks: NeighborLink[]
  videos: DbTrickVideo[]
  elementAssignments: {
    element: {
      id: number
      slug: string
      name: string
    }
  }[]
  outgoingRelationships: {
    type: "prerequisite" | "optional_prerequisite" | "related"
    targetTrick: {
      id: number
      slug: string
      name: string
    }
  }[]
  compositions?: DbTrickComposition[]
}

// Transform database tricks to the Trick type format
export function transformDbTricksToTricksData(
  dbTricks: DbTrickWithRelations[],
): TricksData {
  // First pass: create basic trick objects with slug as id
  const tricks: Trick[] = dbTricks.map((dbTrick) => {
    // Find prerequisite relationship
    const prerequisiteRel = dbTrick.outgoingRelationships.find(
      (r) => r.type === "prerequisite",
    )
    const optionalPrerequisiteRel = dbTrick.outgoingRelationships.find(
      (r) => r.type === "optional_prerequisite",
    )

    // Get related tricks (just the related type) — kept for admin forms
    const relatedTricks = dbTrick.outgoingRelationships
      .filter((r) => r.type === "related")
      .map((r) => r.targetTrick.slug)

    // Transform videos - only include active ones, sorted by sortOrder
    const videos = dbTrick.videos
      .filter((v) => v.status === "active" && v.video?.playbackId)
      .toSorted((a, b) => a.sortOrder - b.sortOrder)
      .map((v) => ({
        id: v.id,
        playbackId: v.video?.playbackId as string,
        status: v.status,
        sortOrder: v.sortOrder,
        notes: v.notes,
      }))

    // Transform compositions
    const compositions = (dbTrick.compositions ?? [])
      .toSorted((a, b) => a.position - b.position)
      .map((c) => ({
        componentId: c.componentTrick.slug,
        componentName: c.componentTrick.name,
        position: c.position,
        catchType: c.catchType,
      }))

    return {
      id: dbTrick.slug, // Use slug as id for compatibility
      dbId: dbTrick.id,
      name: dbTrick.name,
      alternateNames: dbTrick.alternateNames ?? [],
      elements: dbTrick.elementAssignments.map((a) => a.element.slug),
      description: dbTrick.description ?? "",
      prerequisite: prerequisiteRel?.targetTrick.slug ?? null,
      optionalPrerequisite: optionalPrerequisiteRel?.targetTrick.slug ?? null,
      isCompound: dbTrick.isCompound,
      compositions,
      notes: dbTrick.notes,
      referenceVideoUrl: dbTrick.referenceVideoUrl ?? null,
      referenceVideoTimestamp: dbTrick.referenceVideoTimestamp ?? null,
      relatedTricks,
      modifiers: {
        flips: dbTrick.flips,
        spin: dbTrick.spin,
        wrap: dbTrick.wrap,
        twist: dbTrick.twist,
        fakie: dbTrick.fakie,
        tire: dbTrick.tire,
        switchStance: dbTrick.switchStance,
        late: dbTrick.late,
      },
      neighbors: dbTrick.neighborLinks ?? [],
      inventedBy: dbTrick.inventedBy,
      inventedByUserId: dbTrick.inventedByUserId,
      yearLanded: dbTrick.yearLanded,
      videos,
      depth: dbTrick.depth ?? 0,
      dependents: dbTrick.dependentSlugs ?? [],
    }
  })

  const { byId, byElement, elements } = buildIndexes(tricks)
  return { tricks, byId, byElement, elements }
}
