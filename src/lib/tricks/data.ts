import type { Trick, TricksData } from "./types";
// Original tricks data preserved at: ~/data/tricks.json
import rawTricks from "~/data/trick-combinations.json";

// Progression word order for sorting (single flip < double < triple...)
const PROGRESSION_ORDER = [
  "half",
  "crank", // crankflip = single flip
  "single",
  "", // base trick (e.g., "flip" without modifier)
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
];

// Extract sorting key from trick name for natural ordering
function getTrickSortKey(name: string): {
  leadingNumber: number;
  baseWords: string;
  progressionRank: number;
  suffix: string;
} {
  const lower = name.toLowerCase();

  // Extract leading number (e.g., "180" from "180 unispin")
  const leadingMatch = lower.match(/^(\d+(?:\.\d+)?)/);
  const leadingNumber = leadingMatch ? Number.parseFloat(leadingMatch[1]) : 0;

  // Remove leading number for base comparison
  const rest = leadingMatch ? lower.slice(leadingMatch[0].length).trim() : lower;

  // Find progression word and its rank
  let progressionRank = PROGRESSION_ORDER.indexOf("");
  let progressionWord = "";

  for (const [index, prog] of PROGRESSION_ORDER.entries()) {
    if (prog && rest.includes(prog)) {
      // Check if this progression word appears in the name
      const progPattern = new RegExp(`\\b${prog}\\b`);
      if (progPattern.test(rest)) {
        progressionRank = index;
        progressionWord = prog;
        break;
      }
    }
  }

  // Remove progression word from rest to get base words
  const baseWords = rest
    .replace(new RegExp(`\\b${progressionWord}\\b`), "")
    .replaceAll(/\s+/g, " ")
    .trim();

  // Extract any trailing number (e.g., for variations)
  const trailingMatch = rest.match(/(\d+)$/);
  const suffix = trailingMatch ? trailingMatch[1] : "";

  return { leadingNumber, baseWords, progressionRank, suffix };
}

// Export for testing
export { getTrickSortKey };

// Natural sort comparison for trick names
export function compareTrickNames(a: string, b: string): number {
  const keyA = getTrickSortKey(a);
  const keyB = getTrickSortKey(b);

  // First, group by base words (e.g., all "unispin" together, all "flip" together)
  const baseCompare = keyA.baseWords.localeCompare(keyB.baseWords);
  if (baseCompare !== 0) return baseCompare;

  // Within same base, sort by leading number (90 < 180 < 270...)
  if (keyA.leadingNumber !== keyB.leadingNumber) {
    return keyA.leadingNumber - keyB.leadingNumber;
  }

  // Then by progression rank (flip < doubleflip < tripleflip...)
  if (keyA.progressionRank !== keyB.progressionRank) {
    return keyA.progressionRank - keyB.progressionRank;
  }

  // Finally by suffix/trailing number
  return keyA.suffix.localeCompare(keyB.suffix);
}

// Category display order (most common/important first)
const CATEGORY_ORDER = [
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
];

function computeDepthsAndDependents(tricks: Trick[]): void {
  const byId = new Map(tricks.map((t) => [t.id, t]));

  // Reset all depths and dependents
  for (const t of tricks) {
    t.depth = -1;
    t.dependents = [];
  }

  // Build dependents lists (reverse of prerequisites)
  for (const t of tricks) {
    if (t.prerequisite) {
      const prereq = byId.get(t.prerequisite);
      if (prereq) {
        prereq.dependents.push(t.id);
      }
    }
  }

  // Find roots (no prerequisite or prerequisite not in data)
  const roots = tricks.filter(
    (t) => !t.prerequisite || !byId.has(t.prerequisite),
  );
  for (const t of roots) (t.depth = 0);

  // BFS to compute depths
  const queue = [...roots];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const depId of current.dependents) {
      const dep = byId.get(depId);
      if (dep && dep.depth === -1) {
        dep.depth = current.depth + 1;
        queue.push(dep);
      }
    }
  }

  // Handle any remaining tricks (cycles or disconnected)
  for (const t of tricks.filter((t) => t.depth === -1)) (t.depth = 0);
}

function buildIndexes(tricks: Trick[]): {
  byId: Record<string, Trick>;
  byCategory: Record<string, Trick[]>;
  categories: string[];
  prefixes: Trick[];
} {
  const byId: Record<string, Trick> = {};
  const byCategory: Record<string, Trick[]> = {};
  const prefixes: Trick[] = [];
  const categorySet = new Set<string>();

  for (const trick of tricks) {
    byId[trick.id] = trick;

    if (trick.isPrefix) {
      prefixes.push(trick);
    }

    for (const cat of trick.categories) {
      categorySet.add(cat);
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(trick);
    }
  }

  // Sort tricks within each category by depth, then by natural name order
  for (const categoryTricks of Object.values(byCategory)) {
    categoryTricks.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return compareTrickNames(a.name, b.name);
    });
  }

  // Order categories by predefined order, then alphabetically for any new ones
  const categories = [...categorySet].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  return { byId, byCategory, categories, prefixes };
}

let cachedData: TricksData | null = null;

export function getTricksData(): TricksData {
  if (cachedData) return cachedData;

  // Cast raw JSON to Trick[]
  const tricks = rawTricks as Trick[];

  // Compute depths and dependents
  computeDepthsAndDependents(tricks);

  // Build indexes
  const { byId, byCategory, categories, prefixes } = buildIndexes(tricks);

  cachedData = {
    tricks,
    byId,
    byCategory,
    categories,
    prefixes,
  };

  return cachedData;
}
