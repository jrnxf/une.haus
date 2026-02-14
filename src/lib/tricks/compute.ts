import type { Trick, TricksData } from "./types";

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

  const rest = leadingMatch
    ? lower.slice(leadingMatch[0].length).trim()
    : lower;

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
  byElement: Record<string, Trick[]>;
  elements: string[];
  prefixes: Trick[];
} {
  const byId: Record<string, Trick> = {};
  const byElement: Record<string, Trick[]> = {};
  const prefixes: Trick[] = [];
  const elementSet = new Set<string>();

  for (const trick of tricks) {
    byId[trick.id] = trick;

    if (trick.isPrefix) {
      prefixes.push(trick);
    }

    for (const elem of trick.elements) {
      elementSet.add(elem);
      if (!byElement[elem]) {
        byElement[elem] = [];
      }
      byElement[elem].push(trick);
    }
  }

  // Sort tricks within each element by depth, then by natural name order
  for (const elementTricks of Object.values(byElement)) {
    elementTricks.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return compareTrickNames(a.name, b.name);
    });
  }

  // Order elements by predefined order, then alphabetically for any new ones
  const elements = [...elementSet].sort((a, b) => {
    const aIndex = ELEMENT_ORDER.indexOf(a);
    const bIndex = ELEMENT_ORDER.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  return { byId, byElement, elements, prefixes };
}

export function buildTricksData(tricks: Trick[]): TricksData {
  computeDepthsAndDependents(tricks);
  const { byId, byElement, elements, prefixes } = buildIndexes(tricks);

  return {
    tricks,
    byId,
    byElement,
    elements,
    prefixes,
  };
}

// Type for database trick video
export type DbTrickVideo = {
  id: number;
  status: "active" | "pending" | "rejected";
  sortOrder: number;
  notes: string | null;
  video: { playbackId: string | null } | null;
};

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
  notes: string | null;
  videos: DbTrickVideo[];
  elementAssignments: {
    element: {
      id: number;
      slug: string;
      name: string;
    };
  }[];
  outgoingRelationships: {
    type: "prerequisite" | "optional_prerequisite" | "related";
    targetTrick: {
      id: number;
      slug: string;
      name: string;
    };
  }[];
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

    // Transform videos - only include active ones, sorted by sortOrder
    const videos = dbTrick.videos
      .filter((v) => v.status === "active" && v.video?.playbackId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((v) => ({
        id: v.id,
        playbackId: v.video!.playbackId!,
        status: v.status,
        sortOrder: v.sortOrder,
        notes: v.notes,
      }));

    return {
      id: dbTrick.slug, // Use slug as id for compatibility
      name: dbTrick.name,
      alternateNames: dbTrick.alternateNames ?? [],
      elements: dbTrick.elementAssignments.map((a) => a.element.slug),
      definition: dbTrick.definition ?? "",
      prerequisite: prerequisiteRel?.targetTrick.slug ?? null,
      optionalPrerequisite: optionalPrerequisiteRel?.targetTrick.slug ?? null,
      isPrefix: dbTrick.isPrefix,
      notes: dbTrick.notes,
      relatedTricks,
      inventedBy: dbTrick.inventedBy,
      yearLanded: dbTrick.yearLanded,
      videos,
      depth: 0, // Will be computed
      dependents: [], // Will be computed
    };
  });

  return buildTricksData(tricks);
}
