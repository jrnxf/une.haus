export type TournamentRider = {
  userId: number | null;
  name: string | null;
};

export type PrelimStatus = "pending" | "done" | "dq";

export type TournamentTimer = {
  active: boolean;
  riderIndex: number | null;
  matchId: string | null;
  side: 1 | 2 | null;
  startedAt: number | null;
  pausedRemaining: number | null;
  duration: number;
  /** ms remaining for the non-active side (null when unused) */
  otherSideRemaining: number | null;
  /** Whether the display sides are swapped (bracket battles only) */
  swapped: boolean;
};

export type TournamentState = {
  riders: TournamentRider[];
  prelimTime: number;
  battleTime: number;
  finalsTime: number;
  bracketSize: number;

  prelimStatuses: Record<number, PrelimStatus>;
  currentRiderIndex: number | null;

  timer: TournamentTimer | null;

  ranking: number[] | null;

  bracketRiders: TournamentRider[] | null;
  winners: string | null;
  celebrating: boolean;
};

export type TournamentPhase =
  | "setup"
  | "prelims"
  | "ranking"
  | "bracket"
  | "complete";
