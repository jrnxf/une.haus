import * as React from "react";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";

import { useIsTablet } from "~/hooks/use-mobile";
import { useRootRouteContext } from "~/lib/session/hooks";

/** Parser for the `p` (peripherals) search param - array with - delimiter */
const peripheralsParser = parseAsArrayOf(parseAsString, "|");

type UseResponsiveOpenStateOptions = {
  /** Default open state for desktop (default: false) */
  defaultOpen?: boolean;
  /**
   * Server-detected device type. When provided:
   * - "mobile": Uses URL state on mobile viewport (for back-swipe support)
   * - "desktop": Uses local state on mobile viewport (responsive mode, starts closed)
   */
  serverDeviceType?: "mobile" | "desktop";
};

/**
 * Hook for managing open/close state that behaves differently on mobile vs desktop.
 * - Desktop viewport: Simple React state (no URL changes)
 * - Mobile viewport: URL-driven state (true mobile) or local state (responsive desktop)
 *
 * @param key - Unique identifier added/removed from the `p` URL param array when open on mobile
 * @param options - Configuration options
 * @returns Tuple of [open, setOpen, isTablet]
 */
export function useResponsiveOpenState(
  key: string,
  options: UseResponsiveOpenStateOptions = {},
) {
  const { session } = useRootRouteContext();

  const { defaultOpen = false } = options;

  const isTablet = useIsTablet();
  const isMobileViaServer = session.deviceType === "mobile";

  // testing mobile on desktop
  // const [isTablet, isMobileViaServer] = [true, true];

  // Mobile: URL-driven state using nuqs (for back-swipe support)
  // The `p` param is an array of open peripheral keys, delimited by +
  const [peripherals, setPeripherals] = useQueryState("p", peripheralsParser);
  const urlOpen = peripherals?.includes(key) ?? false;

  // Desktop: simple React state
  const [reactOpen, setReactOpen] = React.useState(defaultOpen);

  // Responsive mobile state (when desktop viewport shrinks to mobile size)
  // This starts closed and is independent of desktop state
  const [responsiveMobileOpen, setResponsiveMobileOpen] = React.useState(false);

  // Determine which state to use
  const open = isTablet
    ? isMobileViaServer
      ? urlOpen // True mobile: URL state
      : responsiveMobileOpen // Responsive mobile: local state (starts closed)
    : reactOpen; // Desktop: React state

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (isTablet) {
        // Mobile viewport
        if (isMobileViaServer) {
          // True mobile: URL-based state via nuqs
          // Check current state in updater to avoid race conditions
          setPeripherals((prev) => {
            const isCurrentlyOpen = prev?.includes(key) ?? false;
            if (nextOpen && !isCurrentlyOpen) {
              // Add key only if not already present
              return prev ? [...prev, key] : [key];
            } else if (!nextOpen && isCurrentlyOpen) {
              // Remove key only if present
              const filtered = prev?.filter((k) => k !== key) ?? [];
              return filtered.length > 0 ? filtered : null;
            }
            return prev; // No change needed
          });
        } else {
          // Responsive mobile (desktop shrunk): local state
          setResponsiveMobileOpen(nextOpen);
        }
      } else {
        // Desktop: simple React state
        setReactOpen(nextOpen);
      }
    },
    [isMobileViaServer, isTablet, key, setPeripherals],
  );

  // Reset responsive mobile state when viewport expands back to desktop
  React.useEffect(() => {
    if (!isTablet) {
      setResponsiveMobileOpen(false);
    }
  }, [isTablet]);

  return [open, setOpen, isTablet] as const;
}
