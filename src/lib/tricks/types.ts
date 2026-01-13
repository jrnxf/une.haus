export type Trick = {
  id: string;
  name: string;
  alternateNames: string[];
  categories: string[];
  definition: string;
  inventedBy: string | null;
  yearLanded: number | null;
  videoUrl: string | null;
  videoTimestamp: string | null;
  prerequisite: string | null;
  optionalPrerequisite: string | null;
  isPrefix: boolean;
  notes: string | null;
  depth: number;
  dependents: string[];
};

export type TricksData = {
  tricks: Trick[];
  byId: Record<string, Trick>;
  byCategory: Record<string, Trick[]>;
  categories: string[];
  prefixes: Trick[];
};
