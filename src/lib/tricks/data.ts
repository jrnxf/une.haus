import type { Trick, TricksData } from "./types";
// Original tricks data preserved at: ~/data/tricks.json
// Previous spin+flip combos at: ~/data/trick-combinations.json
import rawTricks from "~/data/tricks-full.json";

import { buildTricksData,  } from "./compute";

// Re-export for backwards compatibility


let cachedData: TricksData | null = null;

/**
 * Get tricks data from static JSON file.
 * Used for the graph visualization until migration to database is complete.
 */
export function getTricksData(): TricksData {
  if (cachedData) return cachedData;

  // Cast raw JSON to Trick[] and add empty videos array
  const tricks = (rawTricks as Omit<Trick, "videos" | "depth" | "dependents">[]).map(
    (t) => ({
      ...t,
      videos: [],
      depth: 0,
      dependents: [],
    }),
  ) as Trick[];

  cachedData = buildTricksData(tricks);

  return cachedData;
}

export {compareTrickNames} from "./compute";