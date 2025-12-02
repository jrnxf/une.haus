import { rootRouteId, useRouteContext } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Regex to match common mobile user agents
const MOBILE_UA_REGEX =
  /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;

/**
 * Isomorphic function to detect mobile.
 * Server: reads User-Agent header
 * Client: returns undefined (we already have the value from SSR context)
 */
export const getIsMobileSSR = createIsomorphicFn()
  .server(() => {
    const userAgent = getRequestHeader("user-agent") ?? "";
    return MOBILE_UA_REGEX.test(userAgent);
  })
  .client(() => undefined);

/**
 * Hook that returns whether the current device is mobile.
 * Uses SSR detection on initial render, then switches to client-side
 * media query for accurate viewport-based detection.
 */
export function useIsMobile() {
  const { isMobile: ssrIsMobile } = useRouteContext({ from: rootRouteId });
  const [isMobile, setIsMobile] = React.useState(ssrIsMobile);

  React.useLayoutEffect(() => {
    const mql = globalThis.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
    );
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
