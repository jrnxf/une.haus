import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeftIcon, RotateCcwIcon, TrophyIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const searchSchema = z.object({
  participants: z.string().optional(),
});

export const Route = createFileRoute("/events/bracket/")({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
});

type Match = {
  id: string;
  round: number;
  position: number;
  player1: string | null;
  player2: string | null;
  winner: 1 | 2 | null;
};

function generateBracket(participants: string[]): Match[] {
  const n = participants.length;
  if (n < 2) return [];

  // Pad to next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const paddedParticipants = [...participants];
  while (paddedParticipants.length < bracketSize) {
    paddedParticipants.push("BYE");
  }

  const matches: Match[] = [];
  const rounds = Math.log2(bracketSize);

  // Generate first round matches
  for (let i = 0; i < bracketSize / 2; i++) {
    matches.push({
      id: `r1-m${i}`,
      round: 1,
      position: i,
      player1: paddedParticipants[i * 2],
      player2: paddedParticipants[i * 2 + 1],
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
        winner: null,
      });
    }
    matchesInRound /= 2;
  }

  // Auto-advance BYE matches
  const firstRoundMatches = matches.filter((m) => m.round === 1);
  for (const match of firstRoundMatches) {
    if (match.player1 === "BYE" && match.player2 !== "BYE") {
      match.winner = 2;
    } else if (match.player2 === "BYE" && match.player1 !== "BYE") {
      match.winner = 1;
    } else if (match.player1 === "BYE" && match.player2 === "BYE") {
      match.winner = 1;
    }
  }

  return matches;
}

function getWinnerName(match: Match): string | null {
  if (!match.winner) return null;
  return match.winner === 1 ? match.player1 : match.player2;
}

function RouteComponent() {
  const { participants: participantsParam } = Route.useSearch();
  const navigate = useNavigate();

  const participantList = useMemo(
    () =>
      participantsParam
        ? participantsParam.split(",").map((p) => p.trim()).filter(Boolean)
        : [],
    [participantsParam],
  );

  const [matches, setMatches] = useState<Match[]>(() =>
    generateBracket(participantList),
  );

  const rounds = Math.max(...matches.map((m) => m.round), 0);

  const selectWinner = useCallback((matchId: string, winner: 1 | 2) => {
    setMatches((prev) => {
      const updated = [...prev];
      const matchIndex = updated.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;

      const match = updated[matchIndex];
      match.winner = winner;

      // Find next round match and populate
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const isTopHalf = match.position % 2 === 0;

      const nextMatch = updated.find(
        (m) => m.round === nextRound && m.position === nextPosition,
      );

      if (nextMatch) {
        const winnerName = getWinnerName(match);
        if (isTopHalf) {
          nextMatch.player1 = winnerName;
        } else {
          nextMatch.player2 = winnerName;
        }
      }

      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    setMatches(generateBracket(participantList));
  }, [participantList]);

  const finalMatch = matches.find((m) => m.round === rounds);
  const champion = finalMatch ? getWinnerName(finalMatch) : null;

  if (participantList.length < 2) {
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/events">
              <ArrowLeftIcon className="size-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border h-4 w-px" />
          <span className="text-sm font-medium">
            {participantList.length} participants
          </span>
        </div>

        <div className="flex items-center gap-2">
          {champion && (
            <div className="flex items-center gap-2 text-sm">
              <TrophyIcon className="text-yellow-500 size-4" />
              <span className="font-semibold">{champion}</span>
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              navigate({
                to: "/events/bracket/setup",
                search: { participants: participantsParam },
              })
            }
          >
            Edit
          </Button>
          <Button variant="secondary" size="icon-xs" onClick={reset}>
            <RotateCcwIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Bracket */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex min-w-max gap-6">
          {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
            const roundMatches = matches
              .filter((m) => m.round === round)
              .sort((a, b) => a.position - b.position);

            const roundName =
              round === rounds
                ? "Final"
                : round === rounds - 1
                  ? "Semifinal"
                  : `Round ${round}`;

            return (
              <div key={round} className="flex flex-col gap-4">
                <div className="text-muted-foreground text-center text-xs font-medium">
                  {roundName}
                </div>
                <div
                  className="flex flex-col justify-around gap-4"
                  style={{
                    minHeight: `${roundMatches.length * 100}px`,
                  }}
                >
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onSelectWinner={selectWinner}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  onSelectWinner,
}: {
  match: Match;
  onSelectWinner: (matchId: string, winner: 1 | 2) => void;
}) {
  const canSelect = match.player1 && match.player2 && !match.winner;

  return (
    <div className="bg-card w-48 overflow-hidden rounded-lg border">
      <button
        type="button"
        disabled={!canSelect || match.player1 === "BYE"}
        onClick={() => canSelect && onSelectWinner(match.id, 1)}
        className={cn(
          "flex w-full items-center justify-between border-b px-4 py-2 text-left text-sm transition-colors",
          canSelect && match.player1 !== "BYE" && "hover:bg-primary/10 cursor-pointer",
          match.winner === 1 && "bg-primary/20 font-semibold",
          match.player1 === "BYE" && "text-muted-foreground italic",
        )}
      >
        <span className="truncate">{match.player1 || "TBD"}</span>
        {match.winner === 1 && <TrophyIcon className="size-3 shrink-0" />}
      </button>
      <button
        type="button"
        disabled={!canSelect || match.player2 === "BYE"}
        onClick={() => canSelect && onSelectWinner(match.id, 2)}
        className={cn(
          "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors",
          canSelect && match.player2 !== "BYE" && "hover:bg-primary/10 cursor-pointer",
          match.winner === 2 && "bg-primary/20 font-semibold",
          match.player2 === "BYE" && "text-muted-foreground italic",
        )}
      >
        <span className="truncate">{match.player2 || "TBD"}</span>
        {match.winner === 2 && <TrophyIcon className="size-3 shrink-0" />}
      </button>
    </div>
  );
}
