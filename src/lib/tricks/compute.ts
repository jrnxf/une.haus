import type { Trick, TricksData } from "./types";

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
];

export function getTrickSortKey(name: string): {
  leadingNumber: number;
  baseWords: string;
  progressionRank: number;
  suffix: string;
} {
  const lower = name.toLowerCase();

  const leadingMatch = lower.match(/^(\d+(?:\.\d+)?)/);
  const leadingNumber = leadingMatch ? Number.parseFloat(leadingMatch[1]) : 0;

  const rest = leadingMatch ? lower.slice(leadingMatch[0].length).trim() : lower;

  let progressionRank = PROGRESSION_ORDER.indexOf("");
  let progressionWord = "";

  for (const [index, prog] of PROGRESSION_ORDER.entries()) {
    if (prog && rest.includes(prog)) {
      const progPattern = new RegExp(`\\b${prog}\\b`);
      if (progPattern.test(rest)) {
        progressionRank = index;
        progressionWord = prog;
        break;
      }
    }
  }

  const baseWords = rest
    .replace(new RegExp(`\\b${progressionWord}\\b`), "")
    .replaceAll(/\s+/g, " ")
    .trim();

  const trailingMatch = rest.match(/(\d+)$/);
  const suffix = trailingMatch ? trailingMatch[1] : "";

  return { leadingNumber, baseWords, progressionRank, suffix };
}

export function compareTrickNames(a: string, b: string): number {
  const keyA = getTrickSortKey(a);
  const keyB = getTrickSortKey(b);

  const baseCompare = keyA.baseWords.localeCompare(keyB.baseWords);
  if (baseCompare !== 0) return baseCompare;

  if (keyA.leadingNumber !== keyB.leadingNumber) {
    return keyA.leadingNumber - keyB.leadingNumber;
  }

  if (keyA.progressionRank !== keyB.progressionRank) {
    return keyA.progressionRank - keyB.progressionRank;
  }

  return keyA.suffix.localeCompare(keyB.suffix);
}

export function computeDepthsAndDependents(tricks: Trick[]): void {
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
  for (const t of roots) t.depth = 0;

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
  for (const t of tricks.filter((t) => t.depth === -1)) t.depth = 0;
}

export function buildIndexes(tricks: Trick[]): {
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

export function buildTricksData(tricks: Trick[]): TricksData {
  computeDepthsAndDependents(tricks);
  const { byId, byCategory, categories, prefixes } = buildIndexes(tricks);

  return {
    tricks,
    byId,
    byCategory,
    categories,
    prefixes,
  };
}

// Type for database trick with relations
export type DbTrickWithRelations = {
  id: number;
  slug: string;
  name: string;
  alternateNames: string[] | null;
  definition: string | null;
  isPrefix: boolean;
  inventedBy: string | null;
  yearLanded: number | null;
  videoUrl: string | null;
  videoTimestamp: string | null;
  notes: string | null;
  categoryAssignments: Array<{
    category: {
      id: number;
      slug: string;
      name: string;
    };
  }>;
  outgoingRelationships: Array<{
    type: "prerequisite" | "optional_prerequisite" | "related";
    targetTrick: {
      id: number;
      slug: string;
      name: string;
    };
  }>;
};

// Transform database tricks to the Trick type format
export function transformDbTricksToTricksData(
  dbTricks: DbTrickWithRelations[],
): TricksData {
  // First pass: create basic trick objects with slug as id
  const tricks: Trick[] = dbTricks.map((dbTrick) => {
    // Find prerequisite relationship
    const prerequisiteRel = dbTrick.outgoingRelationships.find(
      (r) => r.type === "prerequisite",
    );
    const optionalPrerequisiteRel = dbTrick.outgoingRelationships.find(
      (r) => r.type === "optional_prerequisite",
    );

    // Get related tricks (just the related type)
    const relatedTricks = dbTrick.outgoingRelationships
      .filter((r) => r.type === "related")
      .map((r) => r.targetTrick.slug);

    return {
      id: dbTrick.slug, // Use slug as id for compatibility
      name: dbTrick.name,
      alternateNames: dbTrick.alternateNames ?? [],
      categories: dbTrick.categoryAssignments.map((a) => a.category.slug),
      definition: dbTrick.definition ?? "",
      prerequisite: prerequisiteRel?.targetTrick.slug ?? null,
      optionalPrerequisite: optionalPrerequisiteRel?.targetTrick.slug ?? null,
      isPrefix: dbTrick.isPrefix,
      notes: dbTrick.notes,
      relatedTricks,
      inventedBy: dbTrick.inventedBy,
      yearLanded: dbTrick.yearLanded,
      videoUrl: dbTrick.videoUrl,
      videoTimestamp: dbTrick.videoTimestamp,
      depth: 0, // Will be computed
      dependents: [], // Will be computed
    };
  });

  return buildTricksData(tricks);
}
