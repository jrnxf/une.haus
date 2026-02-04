import { useSuspenseQuery } from "@tanstack/react-query";
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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import confetti from "canvas-confetti";
import {
  ArrowLeftIcon,
  MaximizeIcon,
  MinimizeIcon,
  RotateCcwIcon,
  TimerIcon,
  TrophyIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SplitTimer } from "~/components/events/split-timer";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { users as usersApi } from "~/lib/users";
import { cn } from "~/lib/utils";

import {
  bracketPageSearchSchema,
  decodeWinners,
  encodeRidersParam,
  encodeWinners,
  parseRidersParam,
  type ResolvedRiderEntry,
} from "~/lib/events/bracket";

export const Route = createFileRoute("/events/bracket/")({
  component: RouteComponent,
  validateSearch: zodValidator(bracketPageSearchSchema),
  loader: async ({ context }) => {
    // Pre-fetch users so names are available on first paint
    await context.queryClient.ensureQueryData(usersApi.all.queryOptions());
  },
});

type Match = {
  id: string;
  round: number;
  position: number;
  player1: ResolvedRiderEntry | null;
  player2: ResolvedRiderEntry | null;
  player1Seed: number | null;
  player2Seed: number | null;
  winner: 1 | 2 | null;
};

// bye entry for padding brackets
const BYE_ENTRY: ResolvedRiderEntry = { userId: null, name: "bye" };

function isBye(rider: ResolvedRiderEntry | null): boolean {
  return rider?.name === "bye";
}

function getRiderName(rider: ResolvedRiderEntry | null): string | null {
  return rider?.name ?? null;
}

type MatchNodeData = {
  match: Match;
  isFirstRound: boolean;
  isLastRound: boolean;
  totalRounds: number;
  timerDuration: number; // seconds
  onSelectWinner: (matchId: string, winner: 1 | 2) => void;
  onOpenTimer: (match: Match, duration: number) => void;
};

// Simple edge without animation
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

// Layout constants
const NODE_WIDTH = 200;
const NODE_HEIGHT = 64;
const HORIZONTAL_GAP = 80;
const BASE_VERTICAL_GAP = 24;

function generateBracket(participants: ResolvedRiderEntry[]): Match[] {
  const n = participants.length;
  if (n < 2) return [];

  // Pad to next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const paddedParticipants: ResolvedRiderEntry[] = [...participants];
  while (paddedParticipants.length < bracketSize) {
    paddedParticipants.push(BYE_ENTRY);
  }

  const matches: Match[] = [];
  const rounds = Math.log2(bracketSize);

  // Generate first round matches with proper seeding (1st vs last, 2nd vs second-last, etc.)
  for (let i = 0; i < bracketSize / 2; i++) {
    const player1Index = i;
    const player2Index = bracketSize - 1 - i;
    matches.push({
      id: `r1-m${i}`,
      round: 1,
      position: i,
      player1: paddedParticipants[player1Index],
      player2: paddedParticipants[player2Index],
      // Seeds are 1-indexed, but only for real participants (not byes)
      player1Seed: isBye(paddedParticipants[player1Index]) ? null : player1Index + 1,
      player2Seed: isBye(paddedParticipants[player2Index]) ? null : player2Index + 1,
      winner: null,
    });
  }

  // Generate subsequent rounds (empty)
  let matchesInRound = bracketSize / 4;
  for (let round = 2; round <= rounds; round++) {
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `r${round}-m${i}`,
        round,
        position: i,
        player1: null,
        player2: null,
        player1Seed: null,
        player2Seed: null,
        winner: null,
      });
    }
    matchesInRound /= 2;
  }

  // Auto-advance BYE matches in first round
  const firstRoundMatches = matches.filter((m) => m.round === 1);
  for (const match of firstRoundMatches) {
    if (isBye(match.player1) && !isBye(match.player2)) {
      match.winner = 2;
    } else if (isBye(match.player2) && !isBye(match.player1)) {
      match.winner = 1;
    } else if (isBye(match.player1) && isBye(match.player2)) {
      match.winner = 1;
    }
  }

  // Propagate BYE winners through the bracket
  const totalRounds = Math.max(...matches.map((m) => m.round));
  for (let round = 1; round < totalRounds; round++) {
    const roundMatches = matches.filter((m) => m.round === round);
    for (const match of roundMatches) {
      if (match.winner) {
        const nextRound = match.round + 1;
        const nextPosition = Math.floor(match.position / 2);
        const nextMatch = matches.find(
          (m) => m.round === nextRound && m.position === nextPosition,
        );
        if (nextMatch) {
          const isTopHalf = match.position % 2 === 0;
          const winner = match.winner === 1 ? match.player1 : match.player2;
          const winnerSeed = match.winner === 1 ? match.player1Seed : match.player2Seed;
          if (isTopHalf) {
            nextMatch.player1 = winner;
            nextMatch.player1Seed = winnerSeed;
          } else {
            nextMatch.player2 = winner;
            nextMatch.player2Seed = winnerSeed;
          }
          // Auto-advance if opponent is BYE
          if (nextMatch.player1 && nextMatch.player2) {
            if (isBye(nextMatch.player1) && !isBye(nextMatch.player2)) {
              nextMatch.winner = 2;
            } else if (isBye(nextMatch.player2) && !isBye(nextMatch.player1)) {
              nextMatch.winner = 1;
            }
          }
        }
      }
    }
  }

  return matches;
}

function getWinnerName(match: Match): string | null {
  if (!match.winner) return null;
  const winner = match.winner === 1 ? match.player1 : match.player2;
  return getRiderName(winner);
}

/**
 * Apply winners from URL to a generated bracket.
 * Winners map is index-based (matches sorted by round, then position).
 */
function applyWinners(matches: Match[], winners: Map<number, 1 | 2>): Match[] {
  if (winners.size === 0) return matches;

  const updated = matches.map((m) => ({ ...m }));

  // Sort to get index mapping (same order as encoding)
  const sortedMatches = [...updated].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.position - b.position;
  });

  // Build a lookup from match id to sorted index
  const idToIndex = new Map<string, number>();
  for (const [i, m] of sortedMatches.entries()) idToIndex.set(m.id, i);

  // Apply winners in round order (so propagation works correctly)
  const totalRounds = Math.max(...updated.map((m) => m.round));

  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = updated.filter((m) => m.round === round);
    for (const match of roundMatches) {
      const index = idToIndex.get(match.id);
      if (index === undefined) continue;

      const winner = winners.get(index);
      if (!winner) continue;

      // Skip if this is a BYE match (already handled by generateBracket)
      if (isBye(match.player1) || isBye(match.player2)) continue;

      // Skip if players aren't set yet
      if (!match.player1 || !match.player2) continue;

      match.winner = winner;

      // Propagate to next round
      if (match.round < totalRounds) {
        const nextRound = match.round + 1;
        const nextPosition = Math.floor(match.position / 2);
        const isTopHalf = match.position % 2 === 0;
        const winnerRider = winner === 1 ? match.player1 : match.player2;
        const winnerSeed = winner === 1 ? match.player1Seed : match.player2Seed;

        const nextMatch = updated.find(
          (m) => m.round === nextRound && m.position === nextPosition,
        );

        if (nextMatch && winnerRider) {
          if (isTopHalf) {
            nextMatch.player1 = winnerRider;
            nextMatch.player1Seed = winnerSeed;
          } else {
            nextMatch.player2 = winnerRider;
            nextMatch.player2Seed = winnerSeed;
          }
        }
      }
    }
  }

  return updated;
}

function MatchNode({ data }: { data: MatchNodeData }) {
  const { match, isFirstRound, isLastRound, timerDuration, onSelectWinner, onOpenTimer } = data;
  // Allow selecting winner if both players are present (can re-select to change winner)
  const canSelect = match.player1 && match.player2;
  const canOpenTimer = match.player1 && match.player2 && !isBye(match.player1) && !isBye(match.player2);
  const player1Name = getRiderName(match.player1);
  const player2Name = getRiderName(match.player2);
  const player1IsBye = isBye(match.player1);
  const player2IsBye = isBye(match.player2);

  return (
    <div
      className={cn(
        "bg-card group w-[200px] overflow-hidden rounded-lg border shadow-sm",
        isLastRound && "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]",
      )}
    >
      {/* Target handle on left - receives edges from previous round */}
      {!isFirstRound && (
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
            canSelect &&
              !player1IsBye &&
              "hover:bg-muted/50 cursor-pointer",
            match.winner === 1 && "bg-muted/80 font-semibold",
            match.winner === 2 && "text-muted-foreground/50",
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
            <span className="text-muted-foreground/50 shrink-0 text-[10px]">{match.player1Seed}</span>
          )}
          <span className="truncate">{player1Name || <span className="text-muted-foreground">TBD</span>}</span>
          {isLastRound && match.winner === 1 && !player1IsBye && <TrophyIcon className="size-3 shrink-0 text-yellow-500" />}
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
          canSelect &&
            !player2IsBye &&
            "hover:bg-muted/50 cursor-pointer",
          match.winner === 2 && "bg-muted/80 font-semibold",
          match.winner === 1 && "text-muted-foreground/50",
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
          <span className="text-muted-foreground/50 shrink-0 text-[10px]">{match.player2Seed}</span>
        )}
        <span className="truncate">{player2Name || <span className="text-muted-foreground">TBD</span>}</span>
        {isLastRound && match.winner === 2 && !player2IsBye && <TrophyIcon className="size-3 shrink-0 text-yellow-500" />}
      </button>

      {/* Source handle on right - connects to next round */}
      {!isLastRound && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-0 !min-h-0 !min-w-0 !border-0 !bg-transparent"
        />
      )}
    </div>
  );
}

const nodeTypes = {
  match: MatchNode,
};

const edgeTypes = {
  bracket: BracketEdge,
};

// Get timer duration for a match based on its round
function getTimerDuration(
  round: number,
  totalRounds: number,
  stageTimes: { prelims: number; semifinals: number; finals: number },
): number {
  if (round === totalRounds) return stageTimes.finals;
  if (round === totalRounds - 1 && totalRounds > 2) return stageTimes.semifinals;
  return stageTimes.prelims;
}

function buildBracketGraph(
  matches: Match[],
  stageTimes: { prelims: number; semifinals: number; finals: number },
  onSelectWinner: (matchId: string, winner: 1 | 2) => void,
  onOpenTimer: (match: Match, duration: number) => void,
): { nodes: Node<MatchNodeData>[]; edges: Edge[]; bounds: { width: number; height: number } } {
  const nodes: Node<MatchNodeData>[] = [];
  const edges: Edge[] = [];

  if (matches.length === 0) return { nodes, edges, bounds: { width: 0, height: 0 } };

  const totalRounds = Math.max(...matches.map((m) => m.round));
  const firstRoundMatchCount = matches.filter((m) => m.round === 1).length;

  // Calculate Y positions for each match
  // First round: evenly spaced
  // Subsequent rounds: centered between their two feeder matches
  const yPositions = new Map<string, number>();

  // First round positions
  for (let i = 0; i < firstRoundMatchCount; i++) {
    yPositions.set(`r1-m${i}`, i * (NODE_HEIGHT + BASE_VERTICAL_GAP));
  }

  // Calculate positions for subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInThisRound = firstRoundMatchCount / Math.pow(2, round - 1);
    for (let pos = 0; pos < matchesInThisRound; pos++) {
      // Get feeder match positions
      const feeder1Id = `r${round - 1}-m${pos * 2}`;
      const feeder2Id = `r${round - 1}-m${pos * 2 + 1}`;
      const feeder1Y = yPositions.get(feeder1Id) ?? 0;
      const feeder2Y = yPositions.get(feeder2Id) ?? 0;
      // Center between feeders
      yPositions.set(`r${round}-m${pos}`, (feeder1Y + feeder2Y) / 2);
    }
  }

  // Create nodes - simple left to right layout
  for (const match of matches) {
    const x = (match.round - 1) * (NODE_WIDTH + HORIZONTAL_GAP);
    const y = yPositions.get(match.id) ?? 0;
    const timerDuration = getTimerDuration(match.round, totalRounds, stageTimes);
    const isFirstRound = match.round === 1;
    const isLastRound = match.round === totalRounds;

    nodes.push({
      id: match.id,
      type: "match",
      position: { x, y },
      // SSR: explicit dimensions so React Flow can render without measuring
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      // SSR: explicit handle positions for edge rendering
      handles: [
        ...(isFirstRound ? [] : [{
          type: "target" as const,
          position: Position.Left,
          x: 0,
          y: NODE_HEIGHT / 2,
          id: "target",
        }]),
        ...(isLastRound ? [] : [{
          type: "source" as const,
          position: Position.Right,
          x: NODE_WIDTH,
          y: NODE_HEIGHT / 2,
          id: "source",
        }]),
      ],
      data: {
        match,
        isFirstRound,
        isLastRound,
        totalRounds,
        timerDuration,
        onSelectWinner,
        onOpenTimer,
      },
      draggable: false,
    });

    // Create edge to next round
    if (match.round < totalRounds) {
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const nextMatchId = `r${nextRound}-m${nextPosition}`;
      const edgeId = `${match.id}->${nextMatchId}`;

      edges.push({
        id: edgeId,
        source: match.id,
        target: nextMatchId,
        type: "bracket",
      });
    }
  }

  // Calculate bounds of the bracket
  const boundsWidth = totalRounds * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;
  const boundsHeight = firstRoundMatchCount * (NODE_HEIGHT + BASE_VERTICAL_GAP) - BASE_VERTICAL_GAP;

  return { nodes, edges, bounds: { width: boundsWidth, height: boundsHeight } };
}

// Container wrapper for BracketGraph - measures dimensions for SSR
function BracketContainer({
  matches,
  stageTimes,
  selectWinner,
  onOpenTimer,
}: {
  matches: Match[];
  stageTimes: { prelims: number; semifinals: number; finals: number };
  selectWinner: (matchId: string, winner: 1 | 2) => void;
  onOpenTimer: (match: Match, duration: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 }); // SSR defaults

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
          <BracketGraph
            matches={matches}
            stageTimes={stageTimes}
            selectWinner={selectWinner}
            onOpenTimer={onOpenTimer}
            width={dimensions.width}
            height={dimensions.height}
          />
        </ReactFlowProvider>
      </div>
      <Logo className="pointer-events-none absolute bottom-4 right-4 h-10 w-auto" />
    </div>
  );
}

// Inner component that uses ReactFlow hooks - must be inside ReactFlowProvider
function BracketGraph({
  matches,
  stageTimes,
  selectWinner,
  onOpenTimer,
  width,
  height,
}: {
  matches: Match[];
  stageTimes: { prelims: number; semifinals: number; finals: number };
  selectWinner: (matchId: string, winner: 1 | 2) => void;
  onOpenTimer: (match: Match, duration: number) => void;
  width: number;
  height: number;
}) {
  // Build graph data directly from props
  const { nodes, edges } = useMemo(
    () => buildBracketGraph(matches, stageTimes, selectWinner, onOpenTimer),
    [matches, stageTimes, selectWinner, onOpenTimer],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      // SSR: explicit dimensions for server-side rendering
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
        className="!bg-card !border-border !shadow-sm [&_button]:!bg-card [&_button]:!border-border [&_button]:!fill-foreground [&_button:hover]:!bg-muted"
      />
    </ReactFlow>
  );
}

// Pure CSS text scaling using container queries
function FitText({ text }: { text: string }) {
  return (
    <div
      className="w-full [container-type:inline-size]"
      style={{ "--chars": text.length } as React.CSSProperties}
    >
      <span
        className="block whitespace-nowrap text-center font-bold tracking-tight"
        style={{ fontSize: "calc(150cqi / var(--chars))" }}
      >
        {text}
      </span>
    </div>
  );
}

function RouteComponent() {
  const navigate = useNavigate();

  // Read from Route.useSearch() for SSR-compatible initial values
  const { name: eventName, riders: ridersParam, w: winnersParam, prelimsTime, semifinalsTime, finalsTime } = Route.useSearch();

  // Parse riders and winners from URL (available immediately on SSR)
  const ridersEntries = useMemo(() => parseRidersParam(ridersParam), [ridersParam]);
  const winnersMap = useMemo(() => decodeWinners(winnersParam ?? null), [winnersParam]);

  // Users pre-fetched in loader, available immediately
  const { data: allUsers } = useSuspenseQuery(usersApi.all.queryOptions());

  // Create lookup map for users
  const usersMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string; avatarId: string | null }>();
    for (const user of allUsers) {
      map.set(user.id, user);
    }
    return map;
  }, [allUsers]);

  // Resolve names for riders with userIds
  const riders = useMemo(() => {
    return ridersEntries.map((rider): ResolvedRiderEntry => {
      if (rider.userId !== null && !rider.name) {
        const user = usersMap.get(rider.userId);
        return { userId: rider.userId, name: user?.name ?? null };
      }
      return rider;
    });
  }, [ridersEntries, usersMap]);

  const stageTimes = useMemo(() => ({
    prelims: prelimsTime,
    semifinals: semifinalsTime,
    finals: finalsTime,
  }), [prelimsTime, semifinalsTime, finalsTime]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<confetti.CreateTypes | null>(null);
  const [activeTimer, setActiveTimer] = useState<{ match: Match; duration: number } | null>(null);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [prevChampion, setPrevChampion] = useState<string | null | undefined>(undefined);
  const prevChampionForConfettiRef = useRef<string | null | undefined>(undefined);

  // Track actual fullscreen state (may differ from URL during transitions)
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize confetti instance with our canvas
  useEffect(() => {
    if (canvasRef.current && !confettiRef.current) {
      confettiRef.current = confetti.create(canvasRef.current, { resize: true });
    }
  }, []);

  // Track fullscreen changes (don't sync to URL - not needed for sharing)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // Build matches from riders + winners from URL
  const matches = useMemo(() => {
    const bracket = generateBracket(riders);
    return applyWinners(bracket, winnersMap);
  }, [riders, winnersMap]);

  const selectWinner = useCallback((matchId: string, winner: 1 | 2) => {
    // Find the match and its index in sorted order
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    // Sort matches to get index mapping (same order as encoding)
    const sortedMatches = [...matches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.position - b.position;
    });
    const matchIndex = sortedMatches.findIndex((m) => m.id === matchId);
    if (matchIndex === -1) return;

    const previousWinner = match.winner;
    const newWinners = new Map(winnersMap);

    // If changing winner, clear all downstream winners
    if (previousWinner !== null && previousWinner !== winner) {
      const totalRounds = Math.max(...matches.map((m) => m.round));
      let currentRound = match.round;
      let currentPosition = match.position;

      while (currentRound < totalRounds) {
        const nextRound = currentRound + 1;
        const nextPosition = Math.floor(currentPosition / 2);

        // Find the downstream match index and clear its winner
        const downstreamMatch = sortedMatches.find(
          (m) => m.round === nextRound && m.position === nextPosition,
        );
        if (downstreamMatch) {
          const downstreamIndex = sortedMatches.indexOf(downstreamMatch);
          newWinners.delete(downstreamIndex);
        }

        currentRound = nextRound;
        currentPosition = nextPosition;
      }
    }

    // Set the new winner
    newWinners.set(matchIndex, winner);

    // Encode winners and update URL (stringifySearch keeps commas readable)
    const encoded = encodeWinners(
      sortedMatches.map((m, i) => ({
        round: m.round,
        position: m.position,
        winner: newWinners.get(i) ?? null,
      })),
    );
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, w: encoded ?? undefined }),
      replace: true,
    });
  }, [matches, winnersMap, navigate]);

  const reset = useCallback(() => {
    // Clear winners from URL
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, w: undefined }),
      replace: true,
    });
  }, [navigate]);

  const openTimer = useCallback((match: Match, duration: number) => {
    setActiveTimer({ match, duration });
  }, []);

  const rounds = Math.max(...matches.map((m) => m.round), 0);
  const finalMatch = matches.find((m) => m.round === rounds);
  const champion = finalMatch ? getWinnerName(finalMatch) : null;

  // Reset dismissed state when a new champion is crowned (getDerivedStateFromProps pattern)
  if (champion !== prevChampion) {
    if (prevChampion !== undefined && champion && champion !== "BYE") {
      setCelebrationDismissed(false);
    }
    setPrevChampion(champion);
  }
  const showCelebration = !!champion && champion !== "BYE" && !celebrationDismissed;

  // Fire confetti when a new champion is crowned
  useEffect(() => {
    const fireConfetti = confettiRef.current;

    // Initialize ref on first run (don't trigger confetti for existing champion)
    if (prevChampionForConfettiRef.current === undefined) {
      prevChampionForConfettiRef.current = champion;
      return;
    }

    if (champion && champion !== "BYE" && champion !== prevChampionForConfettiRef.current && fireConfetti) {
      prevChampionForConfettiRef.current = champion;

      // Fire confetti bursts
      const duration = 1875; // 1.5x longer
      const end = Date.now() + duration;

      // Full rainbow colors - using bright versions visible on dark backgrounds
      const colors = [
        "#ff6b6b", // bright red
        "#ff8c42", // bright orange
        "#ffd93d", // bright yellow
        "#6bcb77", // bright green
        "#4ecdc4", // bright teal
        "#45b7d1", // bright cyan
        "#4ea8de", // bright sky blue
        "#5e60ce", // bright blue
        "#7950f2", // bright indigo
        "#9775fa", // bright violet
        "#c084fc", // bright purple
        "#f472b6", // bright pink
        "#fb7185", // bright coral
      ];

      // Top row shooting down (offset 400px above viewport so cannon source isn't visible)
      const offsetY = 400 / window.innerHeight;
      const topY = -offsetY;
      const sources = [
        { angle: 270, origin: { x: 0.1, y: topY } },
        { angle: 270, origin: { x: 0.3, y: topY } },
        { angle: 270, origin: { x: 0.5, y: topY } },
        { angle: 270, origin: { x: 0.7, y: topY } },
        { angle: 270, origin: { x: 0.9, y: topY } },
      ];

      let colorIndex = 0;
      const frame = () => {
        // Each source fires with a rotating subset of colors to ensure all colors appear
        for (const source of sources) {
          // Get 3 sequential colors from the palette, rotating through
          const burstColors = [
            colors[colorIndex % colors.length],
            colors[(colorIndex + 1) % colors.length],
            colors[(colorIndex + 2) % colors.length],
          ];
          colorIndex = (colorIndex + 3) % colors.length;

          fireConfetti({
            particleCount: 3,
            angle: source.angle,
            spread: 40,
            origin: source.origin,
            colors: burstColors,
          });
        }

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      // Burst in the center
      fireConfetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
      });
    } else if (!champion) {
      prevChampionForConfettiRef.current = null;
    }
  }, [champion]);

  if (riders.length < 2) {
    return (
      <div className="flex grow flex-col overflow-hidden">
        <div className="border-b">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2 gap-1.5"
              asChild
            >
              <Link to="/events">
                <ArrowLeftIcon className="size-4" />
                Events
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
          <TrophyIcon className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-center">
            No participants configured
          </p>
          <Button asChild>
            <Link to="/events/bracket/setup">Setup</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Timer header with back button
  const timerHeader = activeTimer ? (
    <>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveTimer(null)}>
          <ArrowLeftIcon className="size-4" />
          Bracket
        </Button>
        <div className="bg-border h-4 w-px" />
        <span className="text-sm font-medium">
          {getRiderName(activeTimer.match.player1)} vs {getRiderName(activeTimer.match.player2)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon-xs" onClick={toggleFullscreen}>
          {isFullscreen ? (
            <MinimizeIcon className="size-3.5" />
          ) : (
            <MaximizeIcon className="size-3.5" />
          )}
        </Button>
      </div>
    </>
  ) : null;

  return (
    <div ref={containerRef} className="bg-background flex h-full flex-col">
      {activeTimer ? (
        <SplitTimer
          key={activeTimer.match.id}
          rider1={activeTimer.match.player1 ?? undefined}
          rider2={activeTimer.match.player2 ?? undefined}
          time={activeTimer.duration}
          headerContent={timerHeader}
        />
      ) : showCelebration && champion ? (
        // Celebration screen
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/events">
                  <ArrowLeftIcon className="size-4" />
                  Back
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCelebrationDismissed(true)}>
                Bracket
              </Button>
              <Button variant="secondary" size="icon-xs" onClick={reset}>
                <RotateCcwIcon className="size-3.5" />
              </Button>
              <Button variant="secondary" size="icon-xs" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <MinimizeIcon className="size-3.5" />
                ) : (
                  <MaximizeIcon className="size-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Champion display */}
          <div className="flex flex-1 items-center justify-center overflow-hidden px-8">
            <FitText text={champion} />
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/events">
                  <ArrowLeftIcon className="size-4" />
                  back
                </Link>
              </Button>
              {eventName && (
                <>
                  <div className="bg-border h-4 w-px" />
                  <span className="text-lg font-bold">
                    {eventName}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {champion && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCelebrationDismissed(false)}
                    className="gap-2"
                  >
                    <TrophyIcon className="size-4 text-yellow-500" />
                    {champion}
                  </Button>
                </>
              )}
              <Button variant="secondary" size="sm" asChild>
                <Link
                  to="/events/bracket/setup"
                  search={{ name: eventName, riders: encodeRidersParam(riders) }}
                >
                  Edit
                </Link>
              </Button>
              <Button variant="secondary" size="icon-xs" onClick={reset}>
                <RotateCcwIcon className="size-3.5" />
              </Button>
              <Button variant="secondary" size="icon-xs" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <MinimizeIcon className="size-3.5" />
                ) : (
                  <MaximizeIcon className="size-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Bracket */}
          <BracketContainer
            matches={matches}
            stageTimes={stageTimes}
            selectWinner={selectWinner}
            onOpenTimer={openTimer}
          />
        </>
      )}
      {/* Confetti canvas - must be inside fullscreen container */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed left-0 top-0 z-50 h-screen w-screen"
      />
    </div>
  );
}
