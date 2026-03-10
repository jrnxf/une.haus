export type TrickVideo = {
  id: number
  playbackId: string
  status: "active" | "pending" | "rejected"
  sortOrder: number
  notes: string | null
}

export type TrickModifiers = {
  flips: number
  spin: number
  wrap: string
  twist: number
  fakie: boolean
  tire: string
  switchStance: boolean
  late: boolean
}

export type NeighborLink = {
  id: string
  label: string
  direction: "adds" | "removes"
}

export type Trick = {
  id: string
  dbId: number
  name: string
  alternateNames: string[]
  elements: string[]
  description: string
  inventedBy?: string | null
  inventedByUserId?: number | null
  yearLanded?: number | null
  videos: TrickVideo[]
  prerequisite: string | null
  optionalPrerequisite: string | null
  notes: string | null
  referenceVideoUrl: string | null
  referenceVideoTimestamp: string | null
  relatedTricks?: string[]
  modifiers: TrickModifiers
  neighbors: NeighborLink[]
  depth: number
  dependents: string[]
}

export type TricksData = {
  tricks: Trick[]
  byId: Record<string, Trick>
  byElement: Record<string, Trick[]>
  elements: string[]
}
