export type TrickVideo = {
  id: number;
  playbackId: string;
  status: "active" | "pending" | "rejected";
  sortOrder: number;
  notes: string | null;
};

export type Trick = {
  id: string;
  name: string;
  alternateNames: string[];
  elements: string[];
  definition: string;
  inventedBy?: string | null;
  yearLanded?: number | null;
  videos: TrickVideo[];
  prerequisite: string | null;
  optionalPrerequisite: string | null;
  isPrefix: boolean;
  notes: string | null;
  relatedTricks?: string[];
  depth: number;
  dependents: string[];
};

export type TricksData = {
  tricks: Trick[];
  byId: Record<string, Trick>;
  byElement: Record<string, Trick[]>;
  elements: string[];
  prefixes: Trick[];
};
