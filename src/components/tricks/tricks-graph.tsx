import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useRef } from "react";

import { describeModifierDiff } from "~/lib/tricks/compute";
import type { Trick, TricksData } from "~/lib/tricks";

import { TrickNode, type TrickNodeData } from "./trick-node";

type TricksGraphProps = {
  data: TricksData;
  selectedTrickId: string | null;
  onSelectTrick: (trick: Trick) => void;
  onOpenTrickDetail: (trick: Trick) => void;
  onCenterNodeClick?: (trick: Trick, meta: { metaKey: boolean }) => void;
};

type FlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: TrickNodeData;
  className?: string;
  style?: React.CSSProperties;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

const NODE_TYPES = {
  trick: TrickNode,
};

const NODE_WIDTH = 190;
const NODE_HEIGHT = 90;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 150;

const MAX_ROW_SIZE = 5;

const TRANSITION_DURATION = 300;

const animationStyles = `
  .react-flow__node {
    transition: transform ${TRANSITION_DURATION}ms ease-out, opacity ${TRANSITION_DURATION}ms ease-out;
  }

  .react-flow__node.node-exiting {
    opacity: 0;
    pointer-events: none;
  }

  .react-flow__node.node-entering {
    animation: fadeIn ${TRANSITION_DURATION}ms ease-out forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .react-flow__edge.edge-exiting path {
    opacity: 0;
    transition: opacity ${TRANSITION_DURATION}ms ease-out;
  }

  .react-flow__edge.edge-entering path {
    animation: fadeIn ${TRANSITION_DURATION}ms ease-out forwards;
    opacity: 0;
  }
`;

type NodePosition = {
  x: number;
  y: number;
  relationshipType: "center" | "before" | "after";
  neighborLabel?: string;
};

// Key for all modifiers EXCEPT spin — used to find spin progressions.
function nonSpinKey(trick: Trick): string {
  const m = trick.modifiers;
  return `${m.flips}:${m.wrap}:${m.twist}:${m.fakie}:${m.tire}:${m.switchStance}:${m.late}`;
}

function getNodePositions(
  centerTrick: Trick,
  data: TricksData,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const positionedIds = new Set<string>();

  // Center node
  positions.set(centerTrick.id, { x: 0, y: 0, relationshipType: "center" });
  positionedIds.add(centerTrick.id);

  const beforeItems: { trick: Trick; label: string }[] = [];
  const afterItems: { trick: Trick; label: string }[] = [];

  // For non-compound tricks, find spin progression at exactly ±90 and ±180
  if (!centerTrick.isCompound) {
    const centerKey = nonSpinKey(centerTrick);
    const centerSpin = centerTrick.modifiers.spin;
    const targetSpins = new Set<number>();
    if (centerSpin >= 90) targetSpins.add(centerSpin - 90);
    if (centerSpin >= 180) targetSpins.add(centerSpin - 180);
    targetSpins.add(centerSpin + 90);
    targetSpins.add(centerSpin + 180);

    for (const trick of data.tricks) {
      if (trick.id === centerTrick.id || trick.isCompound) continue;
      if (!targetSpins.has(trick.modifiers.spin)) continue;
      if (nonSpinKey(trick) !== centerKey) continue;

      const item = {
        trick,
        label: describeModifierDiff(centerTrick.modifiers, trick.modifiers),
      };

      if (trick.modifiers.spin < centerSpin) {
        beforeItems.push(item);
      } else {
        afterItems.push(item);
      }
      positionedIds.add(trick.id);
    }

    // Sort: smaller spin on left
    beforeItems.sort((a, b) => a.trick.modifiers.spin - b.trick.modifiers.spin);
    afterItems.sort((a, b) => a.trick.modifiers.spin - b.trick.modifiers.spin);
  }

  // Add curated prerequisites not already positioned
  if (
    centerTrick.prerequisite &&
    data.byId[centerTrick.prerequisite] &&
    !positionedIds.has(centerTrick.prerequisite)
  ) {
    const t = data.byId[centerTrick.prerequisite];
    beforeItems.push({
      trick: t,
      label: describeModifierDiff(centerTrick.modifiers, t.modifiers),
    });
    positionedIds.add(t.id);
  }
  if (
    centerTrick.optionalPrerequisite &&
    data.byId[centerTrick.optionalPrerequisite] &&
    !positionedIds.has(centerTrick.optionalPrerequisite)
  ) {
    const t = data.byId[centerTrick.optionalPrerequisite];
    beforeItems.push({
      trick: t,
      label: describeModifierDiff(centerTrick.modifiers, t.modifiers),
    });
    positionedIds.add(t.id);
  }

  // Add curated dependents not already positioned
  for (const depId of centerTrick.dependents.slice(0, 6)) {
    if (positionedIds.has(depId)) continue;
    const t = data.byId[depId];
    if (t) {
      afterItems.push({
        trick: t,
        label: describeModifierDiff(centerTrick.modifiers, t.modifiers),
      });
      positionedIds.add(t.id);
    }
  }

  // Computed neighbors not already positioned → before/after based on direction
  for (const neighbor of centerTrick.neighbors) {
    if (positionedIds.has(neighbor.id) || !data.byId[neighbor.id]) continue;

    const t = data.byId[neighbor.id];
    const item = { trick: t, label: neighbor.label };

    if (neighbor.direction === "removes") {
      if (beforeItems.length < MAX_ROW_SIZE) {
        beforeItems.push(item);
        positionedIds.add(neighbor.id);
      }
    } else {
      if (afterItems.length < MAX_ROW_SIZE) {
        afterItems.push(item);
        positionedIds.add(neighbor.id);
      }
    }
  }

  // Position before row
  const beforeStartX =
    -((beforeItems.length - 1) * (NODE_WIDTH + HORIZONTAL_GAP)) / 2;
  for (const [index, item] of beforeItems.entries()) {
    positions.set(item.trick.id, {
      x: beforeStartX + index * (NODE_WIDTH + HORIZONTAL_GAP),
      y: -VERTICAL_GAP - NODE_HEIGHT,
      relationshipType: "before",
      neighborLabel: item.label,
    });
  }

  // Position after row
  const afterStartX =
    -((afterItems.length - 1) * (NODE_WIDTH + HORIZONTAL_GAP)) / 2;
  for (const [index, item] of afterItems.entries()) {
    positions.set(item.trick.id, {
      x: afterStartX + index * (NODE_WIDTH + HORIZONTAL_GAP),
      y: VERTICAL_GAP + NODE_HEIGHT,
      relationshipType: "after",
      neighborLabel: item.label,
    });
  }

  return positions;
}

function buildGraphFromTrick(
  centerTrick: Trick,
  data: TricksData,
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const positions = getNodePositions(centerTrick, data);

  // Track which handles are connected for each node
  const connectedHandles = new Map<
    string,
    { top?: boolean; bottom?: boolean }
  >();

  // Initialize all nodes with empty handles
  for (const id of positions.keys()) {
    connectedHandles.set(id, {});
  }

  // First pass: create edges and track connected handles
  for (const [id, pos] of positions) {
    const trick = data.byId[id];
    if (!trick) continue;

    // Create edges for before nodes pointing to center
    if (pos.relationshipType === "before") {
      edges.push({
        id: `${trick.id}->${centerTrick.id}`,
        source: trick.id,
        target: centerTrick.id,
        style: { stroke: "#3b82f6", strokeWidth: 2 },
      });
      connectedHandles.get(trick.id)!.bottom = true;
      connectedHandles.get(centerTrick.id)!.top = true;
    }

    // Create edges from center to after nodes
    if (pos.relationshipType === "after") {
      edges.push({
        id: `${centerTrick.id}->${trick.id}`,
        source: centerTrick.id,
        target: trick.id,
        style: { stroke: "#22c55e", strokeWidth: 2 },
      });
      connectedHandles.get(centerTrick.id)!.bottom = true;
      connectedHandles.get(trick.id)!.top = true;
    }
  }

  // Second pass: create nodes with connected handles info
  for (const [id, pos] of positions) {
    const trick = data.byId[id];
    if (!trick) continue;

    nodes.push({
      id: trick.id,
      type: "trick",
      position: { x: pos.x, y: pos.y },
      data: {
        trick,
        isCenter: pos.relationshipType === "center",
        relationshipType: pos.relationshipType,
        neighborLabel: pos.neighborLabel,
        connectedHandles: connectedHandles.get(id),
      },
      style: { zIndex: 10 },
    });
  }

  return { nodes, edges };
}

function GraphContent({
  data,
  selectedTrickId,
  onSelectTrick,
  onOpenTrickDetail,
  onCenterNodeClick,
}: TricksGraphProps) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  const prevSelectedIdRef = useRef<string | null>(null);
  const isNodeClickRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const pendingFitRef = useRef<{
    duration: number;
    callback?: () => void;
  } | null>(null);

  // Execute pending fitView when nodes are initialized
  useEffect(() => {
    if (nodesInitialized && pendingFitRef.current) {
      const { duration, callback } = pendingFitRef.current;
      pendingFitRef.current = null;
      fitView({ padding: 0.2, duration });
      callback?.();
    }
  }, [nodesInitialized, fitView]);

  // Recenter graph on window resize
  useEffect(() => {
    function handleResize() {
      fitView({ padding: 0.2, duration: 200 });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitView]);

  // Handle sidebar selection changes
  useEffect(() => {
    if (isNodeClickRef.current) {
      isNodeClickRef.current = false;
      prevSelectedIdRef.current = selectedTrickId;
      return;
    }

    const selectedTrick = selectedTrickId ? data.byId[selectedTrickId] : null;

    if (!selectedTrick) {
      setNodes([]);
      setEdges([]);
      prevSelectedIdRef.current = null;
      return;
    }

    const { nodes: newNodes, edges: newEdges } = buildGraphFromTrick(
      selectedTrick,
      data,
    );
    const isFirstLoad = prevSelectedIdRef.current === null;
    prevSelectedIdRef.current = selectedTrickId;

    if (isFirstLoad) {
      setNodes(newNodes);
      setEdges(newEdges);
      pendingFitRef.current = { duration: 0 };
    } else {
      // Sidebar selection - cross-fade to new nodes
      isTransitioningRef.current = true;
      setNodes(newNodes.map((n) => ({ ...n, className: "node-entering" })));
      setEdges(newEdges.map((e) => ({ ...e, className: "edge-entering" })));
      pendingFitRef.current = {
        duration: 300,
        callback: () => {
          isTransitioningRef.current = false;
        },
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrickId]);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      if (isTransitioningRef.current) return;

      const clickedTrick = data.byId[node.id];
      if (!clickedTrick) return;

      // If clicking the center node, navigate to its detail page
      if (node.id === selectedTrickId) {
        onCenterNodeClick?.(clickedTrick, { metaKey: event.metaKey });
        return;
      }

      isNodeClickRef.current = true;
      isTransitioningRef.current = true;

      const { nodes: newNodes, edges: newEdges } = buildGraphFromTrick(
        clickedTrick,
        data,
      );

      setNodes(newNodes.map((n) => ({ ...n, className: "node-entering" })));
      setEdges(newEdges.map((e) => ({ ...e, className: "edge-entering" })));

      pendingFitRef.current = {
        duration: 300,
        callback: () => {
          isTransitioningRef.current = false;
          onSelectTrick(clickedTrick);
        },
      };
    },
    [
      data,
      onCenterNodeClick,
      onSelectTrick,
      selectedTrickId,
      setEdges,
      setNodes,
    ],
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      const trick = data.byId[node.id];
      if (trick) {
        onOpenTrickDetail(trick);
      }
    },
    [data, onOpenTrickDetail],
  );

  const selectedTrick = selectedTrickId ? data.byId[selectedTrickId] : null;

  if (!selectedTrick) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Select a trick</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose from the sidebar to explore relationships
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <ReactFlow
        edges={edges}
        fitView
        maxZoom={1.75}
        minZoom={0.2}
        nodesDraggable={false}
        nodeTypes={NODE_TYPES}
        nodes={nodes}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodesChange={onNodesChange}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="currentColor"
          className="text-muted-foreground/30"
          gap={28}
          size={0.75}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>
    </>
  );
}

export function TricksGraph(props: TricksGraphProps) {
  return <GraphContent {...props} />;
}
