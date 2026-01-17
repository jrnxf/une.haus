import type { Trick, TricksData } from "./types";
// Original tricks data preserved at: ~/data/tricks.json
import rawTricks from "~/data/trick-combinations.json";

import { buildTricksData, compareTrickNames } from "./compute";

// Re-export for backwards compatibility
export { compareTrickNames };

let cachedData: TricksData | null = null;

/**
 * Get tricks data from static JSON file.
 * Used for the graph visualization until migration to database is complete.
 */
export function getTricksData(): TricksData {
  if (cachedData) return cachedData;

  // Cast raw JSON to Trick[]
  const tricks = rawTricks as Trick[];

  cachedData = buildTricksData(tricks);

  return cachedData;
}
