import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

import { Badge } from "~/components/ui/badge";
import type { Trick } from "~/lib/tricks";
import { cn } from "~/lib/utils";

export type TrickNodeData = {
  trick: Trick;
  isCenter: boolean;
  relationshipType: "center" | "before" | "after";
  neighborLabel?: string;
  connectedHandles?: {
    top?: boolean;
    bottom?: boolean;
  };
};

type TrickNodeProps = {
  data: TrickNodeData;
  selected?: boolean;
};

const RELATIONSHIP_STYLES = {
  center: "border-primary ring-2 ring-primary/20",
  before: "border-blue-500/50",
  after: "border-green-500/50",
};

function TrickNodeComponent({ data, selected }: TrickNodeProps) {
  const { trick, relationshipType, neighborLabel, connectedHandles } = data;
  const isCenter = relationshipType === "center";
  const label = isCenter ? null : (neighborLabel ?? "nearby");

  return (
    <>
      {/* Top handle - for vertical edges */}
      {connectedHandles?.top && (
        <Handle
          className="!bg-muted-foreground/50 !h-2 !w-2"
          id="top"
          position={Position.Top}
          type="target"
        />
      )}

      <div
        className={cn(
          "rounded-lg border-2 bg-white px-3.5 py-2.5 shadow-sm transition-all dark:bg-zinc-950",
          "max-w-[220px] min-w-[160px]",
          RELATIONSHIP_STYLES[relationshipType],
          selected && "ring-ring ring-2",
        )}
      >
        {/* Relationship label */}
        {label && (
          <span className="text-muted-foreground mb-0.5 block text-[7px] tracking-wide uppercase">
            {label}
          </span>
        )}

        {/* Trick name */}
        <p className="text-sm leading-tight font-medium lowercase">
          {trick.name}
        </p>

        {/* Elements */}
        <div className="mt-1 flex flex-wrap gap-0.5">
          {trick.elements.map((elem) => (
            <Badge
              className="px-1 py-0 text-[8px] leading-tight lowercase"
              key={elem}
              variant="secondary"
            >
              {elem}
            </Badge>
          ))}
        </div>
      </div>

      {/* Bottom handle - for vertical edges */}
      {connectedHandles?.bottom && (
        <Handle
          className="!bg-muted-foreground/50 !h-2 !w-2"
          id="bottom"
          position={Position.Bottom}
          type="source"
        />
      )}
    </>
  );
}

export const TrickNode = memo(TrickNodeComponent);
