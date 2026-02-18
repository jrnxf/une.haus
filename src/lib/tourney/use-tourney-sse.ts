import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { tourney } from "~/lib/tourney";
import type { TournamentState } from "~/lib/tourney/types";

const ADMIN_TIMEOUT_MS = 15_000;

export function useTourneySSE(code: string) {
  const qc = useQueryClient();
  const queryKey = tourney.get.queryOptions({ code }).queryKey;
  const [adminConnected, setAdminConnected] = useState(true);
  // eslint-disable-next-line react-hooks/purity -- initial timestamp for heartbeat tracking
  const lastHeartbeatRef = useRef(Date.now());

  useEffect(() => {
    const es = new EventSource(`/api/tourney/sse/${code}`);

    // When SSE reconnects after a drop, give the admin a grace period to send
    // a heartbeat before we declare them offline.
    es.addEventListener('open', () => {
      lastHeartbeatRef.current = Date.now();
    });

    // eslint-disable-next-line unicorn/prefer-add-event-listener -- EventSource.onmessage is the standard API for unnamed events
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          phase: string;
          state: TournamentState;
          updatedAt: number;
        };
        qc.setQueryData(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            phase: data.phase as typeof old.phase,
            state: data.state,
          };
        });
        // State updates also count as admin activity
        lastHeartbeatRef.current = Date.now();
        setAdminConnected(true);
      } catch {
        // ignore malformed messages
      }
    };

    es.addEventListener("heartbeat", () => {
      lastHeartbeatRef.current = Date.now();
      setAdminConnected(true);
    });

    // Check for stale heartbeats
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastHeartbeatRef.current;
      setAdminConnected(elapsed < ADMIN_TIMEOUT_MS);
    }, 3000);

    return () => {
      es.close();
      clearInterval(checkInterval);
    };
  }, [code, qc, queryKey]);

  return { adminConnected };
}
