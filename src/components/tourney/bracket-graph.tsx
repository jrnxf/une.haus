import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  getSmoothStepPath,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type EdgeProps,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { MedalIcon, TimerIcon, TrophyIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Logo } from "~/components/logo";
import {
  getRiderName,
  getTimerDuration,
  isBye,
  type Match,
} from "~/lib/tourney/bracket-logic";
import { cn } from "~/lib/utils";

// Layout constants
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 64;
const HORIZONTAL_GAP = 80;
const BASE_VERTICAL_GAP = 24;

type MatchNodeData = {
  match: Match;
  isFirstRound: boolean;
  isLastRound: boolean;
  is3rdPlace: boolean;
  totalRounds: number;
  timerDuration: number;
  interactive: boolean;
  onSelectWinner: (matchId: string, winner: 1 | 2) => void;
  onOpenTimer: (match: Match, duration: number) => void;
};

function BracketEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{ stroke: "var(--color-zinc-500)", strokeWidth: 2 }}
    />
  );
}

function MatchNode({ data }: { data: MatchNodeData }) {
  const {
    match,
    isFirstRound,
    isLastRound,
    is3rdPlace,
    timerDuration,
    interactive,
    onSelectWinner,
    onOpenTimer,
  } = data;
  const canSelect = interactive && match.player1 && match.player2;
  const canOpenTimer =
    interactive &&
    match.player1 &&
    match.player2 &&
    !isBye(match.player1) &&
    !isBye(match.player2);
  const player1Name = getRiderName(match.player1);
  const player2Name = getRiderName(match.player2);
  const player1IsBye = isBye(match.player1);
  const player2IsBye = isBye(match.player2);

  const showGoldGlow = isLastRound && !is3rdPlace;
  const trophyColor = is3rdPlace ? "text-amber-600" : "text-yellow-500";

  return (
    <div
      className={cn(
        "bg-card group w-[200px] overflow-hidden rounded-lg border shadow-sm",
        showGoldGlow &&
          "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]",
        is3rdPlace &&
          "border-amber-600/50 shadow-[0_0_15px_rgba(217,119,6,0.2)]",
      )}
    >
      {is3rdPlace && (
        <div className="border-b px-3 py-0.5 text-center text-[10px] font-medium text-amber-600">
          3rd place
        </div>
      )}

      {!isFirstRound && !is3rdPlace && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-0 !min-h-0 !min-w-0 !border-0 !bg-transparent"
        />
      )}

      <div className="flex items-center border-b">
        <button
          type="button"
          className={cn(
            "nodrag nopan flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-3 py-1.5 text-left text-sm transition-colors",
            canSelect && !player1IsBye && "hover:bg-muted/50 cursor-pointer",
            match.winner === 1 && "bg-muted/80 font-semibold",
            match.winner === 2 && !showGoldGlow && "text-muted-foreground/50",
            player1IsBye && "text-muted-foreground italic",
            (!canSelect || player1IsBye) && "cursor-default",
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (canSelect && !player1IsBye) {
              onSelectWinner(match.id, 1);
            }
          }}
        >
          {match.player1Seed && (
            <span className="text-muted-foreground/50 shrink-0 text-[10px]">
              {match.player1Seed}
            </span>
          )}
          <span className="truncate">
            {player1Name || <span className="text-muted-foreground">TBD</span>}
          </span>
          {showGoldGlow && match.winner && !player1IsBye && (
            <MedalIcon
              className={cn(
                "size-3 shrink-0",
                match.winner === 1 ? "text-yellow-500" : "text-zinc-400",
              )}
            />
          )}
          {is3rdPlace && match.winner === 1 && !player1IsBye && (
            <TrophyIcon className={cn("size-3 shrink-0", trophyColor)} />
          )}
        </button>
        {canOpenTimer && (
          <button
            type="button"
            className="nodrag nopan text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-0 shrink-0 items-center justify-center self-stretch overflow-hidden transition-all duration-150 group-hover:w-8 group-hover:border-l"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTimer(match, timerDuration);
            }}
            title="Open split timer"
          >
            <TimerIcon className="size-3.5" />
          </button>
        )}
      </div>
      <button
        type="button"
        className={cn(
          "nodrag nopan flex w-full min-w-0 items-center gap-2 overflow-hidden px-3 py-1.5 text-left text-sm transition-colors",
          canSelect && !player2IsBye && "hover:bg-muted/50 cursor-pointer",
          match.winner === 2 && "bg-muted/80 font-semibold",
          match.winner === 1 && !showGoldGlow && "text-muted-foreground/50",
          player2IsBye && "text-muted-foreground italic",
          (!canSelect || player2IsBye) && "cursor-default",
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (canSelect && !player2IsBye) {
            onSelectWinner(match.id, 2);
          }
        }}
      >
        {match.player2Seed && (
          <span className="text-muted-foreground/50 shrink-0 text-[10px]">
            {match.player2Seed}
          </span>
        )}
        <span className="truncate">
          {player2Name || <span className="text-muted-foreground">TBD</span>}
        </span>
        {showGoldGlow && match.winner && !player2IsBye && (
          <MedalIcon
            className={cn(
              "size-3 shrink-0",
              match.winner === 2 ? "text-yellow-500" : "text-zinc-400",
            )}
          />
        )}
        {is3rdPlace && match.winner === 2 && !player2IsBye && (
          <TrophyIcon className={cn("size-3 shrink-0", trophyColor)} />
        )}
      </button>

      {!isLastRound && !is3rdPlace && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-0 !min-h-0 !min-w-0 !border-0 !bg-transparent"
        />
      )}
    </div>
  );
}

const nodeTypes = { match: MatchNode };
const edgeTypes = { bracket: BracketEdge };

export function buildBracketGraph(
  matches: Match[],
  stageTimes: { battle: number; finals: number },
  onSelectWinner: (matchId: string, winner: 1 | 2) => void,
  onOpenTimer: (match: Match, duration: number) => void,
  interactive: boolean,
): {
  nodes: Node<MatchNodeData>[];
  edges: Edge[];
  bounds: { width: number; height: number };
} {
  const nodes: Node<MatchNodeData>[] = [];
  const edges: Edge[] = [];

  if (matches.length === 0)
    return { nodes, edges, bounds: { width: 0, height: 0 } };

  const totalRounds = Math.max(...matches.map((m) => m.round));
  const firstRoundMatchCount = matches.filter((m) => m.round === 1).length;

  const yPositions = new Map<string, number>();

  for (let i = 0; i < firstRoundMatchCount; i++) {
    yPositions.set(`r1-m${i}`, i * (NODE_HEIGHT + BASE_VERTICAL_GAP));
  }

  for (let round = 2; round <= totalRounds; round++) {
    const matchesInThisRound = firstRoundMatchCount / Math.pow(2, round - 1);
    for (let pos = 0; pos < matchesInThisRound; pos++) {
      const feeder1Id = `r${round - 1}-m${pos * 2}`;
      const feeder2Id = `r${round - 1}-m${pos * 2 + 1}`;
      const feeder1Y = yPositions.get(feeder1Id) ?? 0;
      const feeder2Y = yPositions.get(feeder2Id) ?? 0;
      yPositions.set(`r${round}-m${pos}`, (feeder1Y + feeder2Y) / 2);
    }
  }

  for (const match of matches) {
    if (match.id === "3rd") continue;

    const x = (match.round - 1) * (NODE_WIDTH + HORIZONTAL_GAP);
    const y = yPositions.get(match.id) ?? 0;
    const timerDuration = getTimerDuration(
      match.round,
      totalRounds,
      stageTimes,
    );
    const isFirstRound = match.round === 1;
    const isLastRound = match.round === totalRounds;

    nodes.push({
      id: match.id,
      type: "match",
      position: { x, y },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      handles: [
        ...(isFirstRound
          ? []
          : [
              {
                type: "target" as const,
                position: Position.Left,
                x: 0,
                y: NODE_HEIGHT / 2,
                id: "target",
              },
            ]),
        ...(isLastRound
          ? []
          : [
              {
                type: "source" as const,
                position: Position.Right,
                x: NODE_WIDTH,
                y: NODE_HEIGHT / 2,
                id: "source",
              },
            ]),
      ],
      data: {
        match,
        isFirstRound,
        isLastRound,
        is3rdPlace: false,
        totalRounds,
        timerDuration,
        interactive,
        onSelectWinner,
        onOpenTimer,
      },
      draggable: false,
    });

    if (match.round < totalRounds) {
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const nextMatchId = `r${nextRound}-m${nextPosition}`;
      edges.push({
        id: `${match.id}->${nextMatchId}`,
        source: match.id,
        target: nextMatchId,
        type: "bracket",
      });
    }
  }

  let boundsWidth =
    totalRounds * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;
  let boundsHeight =
    firstRoundMatchCount * (NODE_HEIGHT + BASE_VERTICAL_GAP) -
    BASE_VERTICAL_GAP;

  const thirdPlaceMatch = matches.find((m) => m.id === "3rd");
  if (thirdPlaceMatch) {
    const thirdPlaceX = (totalRounds - 1) * (NODE_WIDTH + HORIZONTAL_GAP);
    const bracketBottomY = boundsHeight;
    const thirdPlaceY = bracketBottomY + NODE_HEIGHT + BASE_VERTICAL_GAP * 3;
    const thirdPlaceNodeHeight = NODE_HEIGHT + 16;

    nodes.push({
      id: thirdPlaceMatch.id,
      type: "match",
      position: { x: thirdPlaceX, y: thirdPlaceY },
      width: NODE_WIDTH,
      height: thirdPlaceNodeHeight,
      handles: [],
      data: {
        match: thirdPlaceMatch,
        isFirstRound: false,
        isLastRound: false,
        is3rdPlace: true,
        totalRounds,
        timerDuration: stageTimes.finals,
        interactive,
        onSelectWinner,
        onOpenTimer,
      },
      draggable: false,
    });

    boundsHeight = thirdPlaceY + thirdPlaceNodeHeight;
  }

  return { nodes, edges, bounds: { width: boundsWidth, height: boundsHeight } };
}

function BracketGraphInner({
  matches,
  stageTimes,
  selectWinner,
  onOpenTimer,
  interactive,
  width,
  height,
}: {
  matches: Match[];
  stageTimes: { battle: number; finals: number };
  selectWinner: (matchId: string, winner: 1 | 2) => void;
  onOpenTimer: (match: Match, duration: number) => void;
  interactive: boolean;
  width: number;
  height: number;
}) {
  const { nodes, edges } = useMemo(
    () =>
      buildBracketGraph(
        matches,
        stageTimes,
        selectWinner,
        onOpenTimer,
        interactive,
      ),
    [matches, stageTimes, selectWinner, onOpenTimer, interactive],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      width={width}
      height={height}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1.5 }}
      minZoom={0.25}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnDrag
      zoomOnScroll
      proOptions={{ hideAttribution: true }}
    >
      <Background
        color="currentColor"
        className="text-muted-foreground/30"
        gap={28}
        size={0.75}
        variant={BackgroundVariant.Dots}
      />
      <Controls
        showInteractive={false}
        className="!bg-card !border-border [&_button]:!bg-card [&_button]:!border-border [&_button]:!fill-foreground [&_button:hover]:!bg-muted !shadow-sm"
      />
    </ReactFlow>
  );
}

export function BracketContainer({
  matches,
  stageTimes,
  selectWinner,
  onOpenTimer,
  interactive = true,
}: {
  matches: Match[];
  stageTimes: { battle: number; finals: number };
  selectWinner: (matchId: string, winner: 1 | 2) => void;
  onOpenTimer: (match: Match, duration: number) => void;
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1">
      <div className="absolute inset-0">
        <ReactFlowProvider>
          <BracketGraphInner
            matches={matches}
            stageTimes={stageTimes}
            selectWinner={selectWinner}
            onOpenTimer={onOpenTimer}
            interactive={interactive}
            width={dimensions.width}
            height={dimensions.height}
          />
        </ReactFlowProvider>
      </div>
      <Logo className="pointer-events-none absolute right-4 bottom-4 h-10 w-auto" />
    </div>
  );
}

export function FitText({ text }: { text: string }) {
  return (
    <div
      className="[container-type:inline-size] w-full"
      style={{ "--chars": text.length } as React.CSSProperties}
    >
      <span
        className="block text-center font-bold whitespace-nowrap"
        style={{ fontSize: "calc(150cqi / var(--chars))" }}
      >
        {text}
      </span>
    </div>
  );
}
