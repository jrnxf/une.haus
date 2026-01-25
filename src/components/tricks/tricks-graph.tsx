import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Trick, TricksData } from "~/lib/tricks";

import { TrickNode, type TrickNodeData } from "./trick-node";

type TricksGraphProps = {
  data: TricksData;
  selectedTrickId: string | null;
  onSelectTrick: (trick: Trick) => void;
  onOpenTrickDetail: (trick: Trick) => void;
  onCenterNodeClick?: (trick: Trick) => void;
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
  sourceHandle?: string;
  targetHandle?: string;
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
const RELATED_HORIZONTAL_OFFSET = 350;

const TRANSITION_DURATION = 300;

// Extract the base pattern from a trick name for finding related tricks
// e.g., "720 Side Spin" -> "720", "Tripleflip" -> "tripleflip", "Backflip" -> "backflip"
function getTrickBasePattern(name: string): string | null {
  const lower = name.toLowerCase();

  // Extract leading number (e.g., "720" from "720 Side Spin")
  const numberMatch = lower.match(/^(\d+)/);
  if (numberMatch) {
    return numberMatch[1];
  }

  // For non-numbered tricks, extract the core trick type
  // e.g., "Tripleflip" -> "flip", "Backflip" -> "flip"
  const flipMatch = lower.match(/(flip|spin|roll|wrap|twist)$/);
  if (flipMatch) {
    return flipMatch[1];
  }

  return null;
}

// Find related tricks - same base pattern but different trick
function findRelatedTricks(
  centerTrick: Trick,
  data: TricksData,
  excludeIds: Set<string>,
): Trick[] {
  const basePattern = getTrickBasePattern(centerTrick.name);
  if (!basePattern) return [];

  const related: Trick[] = [];

  for (const trick of data.tricks) {
    if (trick.id === centerTrick.id) continue;
    if (excludeIds.has(trick.id)) continue;

    const trickPattern = getTrickBasePattern(trick.name);
    if (trickPattern === basePattern && trick.name !== centerTrick.name) {
      related.push(trick);
    }
  }

  // Sort by name similarity and limit
  return related.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 4);
}

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
  relationshipType: "center" | "before" | "after" | "related";
  relatedSide?: "left" | "right";
};

function getNodePositions(
  centerTrick: Trick,
  data: TricksData,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();

  // Center node
  positions.set(centerTrick.id, { x: 0, y: 0, relationshipType: "center" });

  // Prerequisites (before)
  const beforeTricks: Trick[] = [];
  if (centerTrick.prerequisite && data.byId[centerTrick.prerequisite]) {
    beforeTricks.push(data.byId[centerTrick.prerequisite]);
  }
  if (
    centerTrick.optionalPrerequisite &&
    data.byId[centerTrick.optionalPrerequisite]
  ) {
    beforeTricks.push(data.byId[centerTrick.optionalPrerequisite]);
  }

  const beforeStartX =
    -((beforeTricks.length - 1) * (NODE_WIDTH + HORIZONTAL_GAP)) / 2;
  for (const [index, trick] of beforeTricks.entries()) {
    positions.set(trick.id, {
      x: beforeStartX + index * (NODE_WIDTH + HORIZONTAL_GAP),
      y: -VERTICAL_GAP - NODE_HEIGHT,
      relationshipType: "before",
    });
  }

  // Dependents (after)
  const afterTricks = centerTrick.dependents
    .slice(0, 6)
    .map((id) => data.byId[id])
    .filter(Boolean) as Trick[];

  const afterStartX =
    -((afterTricks.length - 1) * (NODE_WIDTH + HORIZONTAL_GAP)) / 2;
  for (const [index, trick] of afterTricks.entries()) {
    positions.set(trick.id, {
      x: afterStartX + index * (NODE_WIDTH + HORIZONTAL_GAP),
      y: VERTICAL_GAP + NODE_HEIGHT,
      relationshipType: "after",
    });
  }

  // Related tricks (split evenly left and right of center)
  const excludeIds = new Set(positions.keys());
  const relatedTricks = findRelatedTricks(centerTrick, data, excludeIds);

  // Split into left and right groups
  const midpoint = Math.ceil(relatedTricks.length / 2);
  const leftTricks = relatedTricks.slice(0, midpoint);
  const rightTricks = relatedTricks.slice(midpoint);

  // Position left side
  const leftStartY = -((leftTricks.length - 1) * (NODE_HEIGHT + 20)) / 2;
  for (const [index, trick] of leftTricks.entries()) {
    positions.set(trick.id, {
      x: -RELATED_HORIZONTAL_OFFSET,
      y: leftStartY + index * (NODE_HEIGHT + 20),
      relationshipType: "related",
      relatedSide: "left",
    });
  }

  // Position right side
  const rightStartY = -((rightTricks.length - 1) * (NODE_HEIGHT + 20)) / 2;
  for (const [index, trick] of rightTricks.entries()) {
    positions.set(trick.id, {
      x: RELATED_HORIZONTAL_OFFSET,
      y: rightStartY + index * (NODE_HEIGHT + 20),
      relationshipType: "related",
      relatedSide: "right",
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
    { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }
  >();

  // Initialize all nodes with empty handles
  for (const id of positions.keys()) {
    connectedHandles.set(id, {});
  }

  // First pass: create edges and track connected handles
  for (const [id, pos] of positions) {
    const trick = data.byId[id];
    if (!trick) continue;

    // Create edges for prerequisites pointing to center
    if (pos.relationshipType === "before") {
      edges.push({
        id: `${trick.id}->${centerTrick.id}`,
        source: trick.id,
        target: centerTrick.id,
        style: { stroke: "#3b82f6", strokeWidth: 2 },
      });
      // Before node connects via bottom, center receives via top
      connectedHandles.get(trick.id)!.bottom = true;
      connectedHandles.get(centerTrick.id)!.top = true;
    }

    // Create edges from center to dependents
    if (pos.relationshipType === "after") {
      edges.push({
        id: `${centerTrick.id}->${trick.id}`,
        source: centerTrick.id,
        target: trick.id,
        style: { stroke: "#22c55e", strokeWidth: 2 },
      });
      // Center connects via bottom, after node receives via top
      connectedHandles.get(centerTrick.id)!.bottom = true;
      connectedHandles.get(trick.id)!.top = true;
    }

    // Create dashed edges from related tricks to center using side handles
    if (pos.relationshipType === "related" && pos.relatedSide) {
      const isLeft = pos.relatedSide === "left";
      edges.push({
        id: `${centerTrick.id}<->${trick.id}`,
        source: trick.id,
        target: centerTrick.id,
        sourceHandle: isLeft ? "right" : "left",
        targetHandle: isLeft ? "left" : "right",
        style: { stroke: "#a855f7", strokeWidth: 1.5, strokeDasharray: "5 3" },
      });
      // Related node connects via its side handle
      if (isLeft) {
        connectedHandles.get(trick.id)!.right = true;
        connectedHandles.get(centerTrick.id)!.left = true;
      } else {
        connectedHandles.get(trick.id)!.left = true;
        connectedHandles.get(centerTrick.id)!.right = true;
      }
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
        relatedSide: pos.relatedSide,
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  const prevSelectedIdRef = useRef<string | null>(null);
  const isNodeClickRef = useRef(false);

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
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    } else {
      // Sidebar selection - fade everything out then in
      setIsTransitioning(true);
      setNodes((current) =>
        current.map((n) => ({ ...n, className: "node-exiting" })),
      );
      setEdges((current) =>
        current.map((e) => ({ ...e, className: "edge-exiting" })),
      );

      setTimeout(() => {
        setNodes(newNodes.map((n) => ({ ...n, className: "node-entering" })));
        setEdges(newEdges.map((e) => ({ ...e, className: "edge-entering" })));
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 300 });
          setIsTransitioning(false);
        }, 50);
      }, TRANSITION_DURATION);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrickId]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      if (isTransitioning) return;

      const clickedTrick = data.byId[node.id];
      if (!clickedTrick) return;

      // If clicking the center node, navigate to its detail page
      if (node.id === selectedTrickId) {
        onCenterNodeClick?.(clickedTrick);
        return;
      }

      isNodeClickRef.current = true;
      setIsTransitioning(true);

      // Build the new graph upfront so we have connectedHandles info for transitions
      const { nodes: newNodes, edges: newEdges } = buildGraphFromTrick(
        clickedTrick,
        data,
      );
      const newNodesById = new Map(newNodes.map((n) => [n.id, n]));

      const currentNodeIds = new Set(nodes.map((n) => n.id));
      const newNodeIds = new Set(newNodes.map((n) => n.id));

      // Categorize nodes
      const persistingIds = new Set(
        [...currentNodeIds].filter((id) => newNodeIds.has(id)),
      );
      const exitingIds = new Set(
        [...currentNodeIds].filter((id) => !newNodeIds.has(id)),
      );
      const enteringIds = new Set(
        [...newNodeIds].filter((id) => !currentNodeIds.has(id)),
      );

      // Phase 1: Move persisting nodes to new positions, fade out exiting nodes
      setNodes((current) =>
        current.map((n) => {
          if (exitingIds.has(n.id)) {
            return { ...n, className: "node-exiting" };
          }
          if (persistingIds.has(n.id)) {
            const newNode = newNodesById.get(n.id)!;
            return {
              ...n,
              position: newNode.position,
              data: newNode.data,
              className: "",
            };
          }
          return n;
        }),
      );

      // Fade out all edges immediately
      setEdges((current) =>
        current.map((e) => ({ ...e, className: "edge-exiting" })),
      );

      // Phase 2: After transition, add new nodes and edges
      setTimeout(() => {
        // Remove exiting nodes, keep persisting, add entering
        setNodes((current) => {
          const persistingNodes = current
            .filter((n) => persistingIds.has(n.id))
            .map((n) => {
              const newNode = newNodes.find((nn) => nn.id === n.id);
              return newNode ? { ...newNode, className: "" } : n;
            });

          const enteringNodes = newNodes
            .filter((n) => enteringIds.has(n.id))
            .map((n) => ({ ...n, className: "node-entering" }));

          return [...persistingNodes, ...enteringNodes];
        });

        // Add new edges
        setEdges(newEdges.map((e) => ({ ...e, className: "edge-entering" })));

        setTimeout(() => {
          fitView({ padding: 0.2, duration: 300 });
          setIsTransitioning(false);
          onSelectTrick(clickedTrick);
        }, 50);
      }, TRANSITION_DURATION);
    },
    [
      data,
      fitView,
      isTransitioning,
      nodes,
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
