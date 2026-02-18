import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { tourney } from "~/lib/tourney";
import type { TournamentTimer } from "~/lib/tourney/types";

const HEARTBEAT_INTERVAL_MS = 5000;  

export function useCreateTournament() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: tourney.create.fn,
    onSuccess: (tournament) => {
      qc.removeQueries({ queryKey: tourney.list.queryOptions().queryKey });
      toast.success("Tournament created");
      navigate({
        to: "/tourney/$code/prelims",
        params: { code: tournament.code },
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function usePrelimAction(code: string) {
  const qc = useQueryClient();
  const queryKey = tourney.get.queryOptions({ code }).queryKey;

  return useMutation({
    mutationFn: tourney.prelim.fn,
    onSuccess: ({ state }) => {
      qc.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return { ...old, state, updatedAt: new Date() };
      });
    },
    onError: (error) => {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey });
    },
  });
}

export function useRankingAction(code: string) {
  const qc = useQueryClient();
  const queryKey = tourney.get.queryOptions({ code }).queryKey;

  return useMutation({
    mutationFn: tourney.rank.fn,
    onSuccess: ({ state }) => {
      qc.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return { ...old, state, updatedAt: new Date() };
      });
    },
    onError: (error) => {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey });
    },
  });
}

export function useBracketAction(code: string) {
  const qc = useQueryClient();
  const queryKey = tourney.get.queryOptions({ code }).queryKey;

  return useMutation({
    mutationFn: tourney.bracket.fn,
    onSuccess: ({ state }) => {
      qc.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return { ...old, state, updatedAt: new Date() };
      });
    },
    onError: (error) => {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey });
    },
  });
}

export function useAdvancePhase(code: string) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const queryKey = tourney.get.queryOptions({ code }).queryKey;

  return useMutation({
    mutationFn: tourney.advancePhase.fn,
    onSuccess: ({ phase, state }) => {
      qc.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return { ...old, phase, state, updatedAt: new Date() };
      });
      // Navigate to the new phase
      switch (phase) {
        case "prelims": {
          navigate({ to: "/tourney/$code/prelims", params: { code } });
          break;
        }
        case "ranking": {
          navigate({ to: "/tourney/$code/ranking", params: { code } });
          break;
        }
        case "bracket": {
          navigate({ to: "/tourney/$code/bracket", params: { code } });
          break;
        }
      }
    },
    onError: (error) => {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Sends periodic heartbeat to signal admin presence to spectators.
 * Call this in every admin tournament route.
 */
export function useAdminHeartbeat(code: string) {
  const send = useCallback(() => {
    tourney.heartbeat.fn({ data: { code } }).catch(() => {
      // ignore heartbeat failures silently
    });
  }, [code]);

  useEffect(() => {
    // Send immediately on mount
    send();
    const id = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [send]);
}

/**
 * Derives timeRemaining (ms) from server-authoritative timer state.
 * Works for both admin (local updates) and spectator (SSE updates).
 */
/* eslint-disable react-hooks/refs -- timer hook uses render-time ref sync and Date.now() for time calculation */
export function useSyncedTimer(timer: TournamentTimer | null): number | null {
  const computeRemaining = (t: TournamentTimer | null): number | null => {
    if (!t) return null;
    if (t.pausedRemaining !== null) return t.pausedRemaining;
    if (t.active && t.startedAt) {
      return Math.max(0, t.duration * 1000 - (Date.now() - t.startedAt));
    }
    return t.duration * 1000;
  };

  const [timeRemaining, setTimeRemaining] = useState<number | null>(() =>
    computeRemaining(timer),
  );

  const timerRef = useRef(timer);
  timerRef.current = timer;

  // Re-sync when timer prop changes (render-time state sync per React docs)
  const prevTimerJson = useRef<string>("");
  const currentJson = JSON.stringify(timer);
  if (currentJson !== prevTimerJson.current) {
    prevTimerJson.current = currentJson;
    setTimeRemaining(computeRemaining(timer));
  }

  useEffect(() => {
    if (!timer?.active || !timer.startedAt) return;

    const id = setInterval(() => {
      const t = timerRef.current;
      if (!t?.active || !t.startedAt) return;
      const remaining = t.duration * 1000 - (Date.now() - t.startedAt);
      setTimeRemaining(Math.max(0, remaining));
    }, 16);

    return () => clearInterval(id);
  }, [timer?.active, timer?.startedAt]);

  return timeRemaining;
}
/* eslint-enable react-hooks/refs */
