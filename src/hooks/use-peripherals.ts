import { useRouter } from "@tanstack/react-router";
import * as React from "react";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";

/** Parser for the `p` (peripherals) search param - array with | delimiter */
const peripheralsParser = parseAsArrayOf(parseAsString, "|");

/**
 * Hook for managing peripheral open/close state via URL.
 * State is stored in the `p` search param as a pipe-delimited array.
 *
 * @param key - Unique identifier added/removed from the `p` URL param array when open
 * @returns Tuple of [open, setOpen]
 */
export function usePeripherals(key: string) {
  const router = useRouter();
  const [peripherals, setPeripherals] = useQueryState("p", {
    ...peripheralsParser,
    history: "push",
  });

  const open = peripherals?.includes(key) ?? false;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        // OPENING: Push new history entry via nuqs
        setPeripherals((prev) => {
          const isCurrentlyOpen = prev?.includes(key) ?? false;
          if (!isCurrentlyOpen) {
            return prev ? [...prev, key] : [key];
          }
          return prev;
        });
      } else {
        // CLOSING: Go back to pop the entry (iOS swipe-back fix)
        router.history.back();
      }
    },
    [key, setPeripherals, router],
  );

  // Programmatic close via URL replace (no history.back)
  const dismiss = React.useCallback(() => {
    setPeripherals(
      (prev) => {
        if (!prev) return prev;
        const next = prev.filter((k) => k !== key);
        return next.length > 0 ? next : null;
      },
      { history: "replace" },
    );
  }, [key, setPeripherals]);

  return [open, setOpen, dismiss] as const;
}
