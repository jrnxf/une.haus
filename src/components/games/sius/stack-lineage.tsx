import { ArrowDownIcon } from "lucide-react";

import { SiuStackCard } from "./stack-card";

type Stack = {
  id: number;
  name: string;
  position: number;
  user: {
    id: number;
    name: string;
    avatarId: string | null;
  };
  likes?: unknown[];
  messages?: unknown[];
  parentStack?: {
    id: number;
    name: string;
    user?: {
      id: number;
      name: string;
    };
  } | null;
};

type StackLineageProps = {
  stacks: Stack[];
};

export function StackLineage({ stacks }: StackLineageProps) {
  if (stacks.length === 0) {
    return null;
  }

  // Stacks should already be ordered by position desc (newest first)
  const latestPosition = stacks[0]?.position ?? 0;

  return (
    <div className="space-y-3">
      {stacks.map((stack, index) => (
        <div key={stack.id}>
          <SiuStackCard
            stack={stack}
            isLatest={stack.position === latestPosition}
          />

          {/* Show arrow between stacks (not after the last one) */}
          {index < stacks.length - 1 && (
            <div className="flex justify-center py-2">
              <div className="text-muted-foreground flex flex-col items-center">
                <div className="bg-border h-4 w-px" />
                <ArrowDownIcon className="size-4" />
                <div className="bg-border h-4 w-px" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
