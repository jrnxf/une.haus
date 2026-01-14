import { ArrowDownIcon } from "lucide-react";

import { BiuSetCard } from "./set-card";

type Set = {
  id: number;
  name: string;
  position: number;
  flaggedAt: Date | null;
  user: {
    id: number;
    name: string;
    avatarId: string | null;
  };
  likes?: unknown[];
  messages?: unknown[];
  parentSet?: {
    id: number;
    name: string;
    user?: {
      id: number;
      name: string;
    };
  } | null;
};

type SetLineageProps = {
  sets: Set[];
};

export function SetLineage({ sets }: SetLineageProps) {
  if (sets.length === 0) {
    return null;
  }

  // Sets should already be ordered by position desc (newest first)
  const latestPosition = sets[0]?.position ?? 0;

  return (
    <div className="space-y-1">
      {sets.map((set, index) => (
        <div key={set.id} className="space-y-1">
          <BiuSetCard set={set} isLatest={set.position === latestPosition} />

          {/* Show arrow between sets (not after the last one) */}
          {index < sets.length - 1 && (
            <div className="flex justify-center py-1">
              <ArrowDownIcon className="text-muted-foreground size-4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
