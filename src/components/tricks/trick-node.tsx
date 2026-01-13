import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

import type { Trick } from "~/lib/tricks";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export type TrickNodeData = {
  trick: Trick;
  isCenter: boolean;
  relationshipType: "center" | "before" | "after" | "related";
  relatedSide?: "left" | "right";
  connectedHandles?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
  };
};

type TrickNodeProps = {
  data: TrickNodeData;
  selected?: boolean;
};

const RELATIONSHIP_STYLES = {
  center: "border-primary bg-primary/5 ring-2 ring-primary/20",
  before: "border-blue-500/50 bg-blue-500/5",
  after: "border-green-500/50 bg-green-500/5",
  related: "border-purple-500/50 bg-purple-500/5",
};

const RELATIONSHIP_LABELS = {
  center: null,
  before: "prerequisite",
  after: "unlocks",
  related: "related",
};

function TrickNodeComponent({ data, selected }: TrickNodeProps) {
  const { trick, relationshipType, connectedHandles } = data;
  const isCenter = relationshipType === "center";

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

      {/* Left handle - for center node and right-side related nodes */}
      {connectedHandles?.left && (
        <Handle
          className="!bg-muted-foreground/50 !h-2 !w-2"
          id="left"
          position={Position.Left}
          type={isCenter ? "target" : "source"}
        />
      )}

      {/* Right handle - for center node and left-side related nodes */}
      {connectedHandles?.right && (
        <Handle
          className="!bg-muted-foreground/50 !h-2 !w-2"
          id="right"
          position={Position.Right}
          type={isCenter ? "target" : "source"}
        />
      )}

      <div
        className={cn(
          "rounded-lg border-2 bg-background px-3.5 py-2.5 shadow-sm transition-all",
          "min-w-[160px] max-w-[220px]",
          RELATIONSHIP_STYLES[relationshipType],
          selected && "ring-2 ring-ring",
        )}
      >
        {/* Relationship label */}
        {RELATIONSHIP_LABELS[relationshipType] && (
          <span className="text-muted-foreground mb-1 block text-[11px] uppercase tracking-wide">
            {RELATIONSHIP_LABELS[relationshipType]}
          </span>
        )}

        {/* Trick name */}
        <p className="font-medium leading-tight">{trick.name}</p>

        {/* Categories */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {trick.categories.slice(0, 2).map((cat) => (
            <Badge
              className="px-1.5 py-0 text-[10px]"
              key={cat}
              variant="secondary"
            >
              {cat}
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
