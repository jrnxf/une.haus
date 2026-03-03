import { buildTricksData } from "./compute"
import { type Trick, type TricksData } from "./types"
// Original tricks data preserved at: ~/data/tricks.json
// Previous spin+flip combos at: ~/data/trick-combinations.json
import rawTricks from "~/data/tricks-full.json"

// Re-export for backwards compatibility

let cachedData: TricksData | null = null

/**
 * Get tricks data from static JSON file.
 * Used for the graph visualization until migration to database is complete.
 */
export function getTricksData(): TricksData {
  if (cachedData) return cachedData

  // Cast raw JSON to Trick[] and add empty videos array
  // JSON data may contain legacy fields (isPrefix) not in Trick type
  const tricks = (rawTricks as unknown as Trick[]).map((t) => ({
    ...t,
    videos: [] as Trick["videos"],
    depth: 0,
    dependents: [] as string[],
  }))

  cachedData = buildTricksData(tricks)

  return cachedData
}

export { compareTrickNames } from "./compute"
