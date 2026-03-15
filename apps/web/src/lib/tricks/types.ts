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
  id: number
  label: string
  direction: "adds" | "removes"
}

export type Trick = {
  id: number
  name: string
  alternateNames: string[]
  elements: string[]
  description: string
  inventedBy?: string | null
  inventedByUserId?: number | null
  yearLanded?: number | null
  videos: TrickVideo[]
  prerequisite: number | null
  optionalPrerequisite: number | null
  notes: string | null
  referenceVideoUrl: string | null
  referenceVideoTimestamp: string | null
  relatedTricks?: number[]
  modifiers: TrickModifiers
  neighbors: NeighborLink[]
  depth: number
  dependents: number[]
}

export type TricksData = {
  tricks: Trick[]
  byId: Record<number, Trick>
  byElement: Record<string, Trick[]>
  elements: string[]
}
