import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import createGlobe from "cobe";

import { useTheme } from "~/lib/theme/context";
import { cn } from "~/lib/utils";

type Coordinates = {
  lat: number;
  lng: number;
};

const THETA_OFFSET = -0.4;
const DOUBLE_PI = Math.PI * 2;

// Round to 3 decimal places
const round3 = (value: number): number => {
  return Math.round(value * 1000) / 1000;
};

const locationToPhiTheta = ({ lat, lng }: Coordinates): [number, number] => {
  return [
    round3(Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2)), // phi
    round3((lat * Math.PI) / 180 + THETA_OFFSET), // theta
  ];
};

export function Globe(properties: {
  location: Coordinates | null | undefined;
}) {
  const canvasReference = useRef<HTMLCanvasElement>(null);

  const { resolvedTheme } = useTheme();
  const globeReference = useRef<null | ReturnType<typeof createGlobe>>(null);
  const noLocation = properties.location === undefined;
  const nextLocation = useRef<Coordinates>(
    properties.location ?? { lat: 0, lng: 0 },
  );

  // State restoration for phi/theta
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  // If phi/theta exist in URL, we're restoring state (e.g., from back navigation)
  // Use them immediately without animation
  const hasRestoredState =
    search.phi !== undefined && search.theta !== undefined;

  // Handle globe initialization and animation
  useEffect(() => {
    const canvas = canvasReference.current;
    if (!canvas) return;

    // const width = 200;
    let width = canvas.offsetWidth;
    const setWidth = () => {
      width = canvas.offsetWidth;
    };
    window.addEventListener("resize", setWidth);

    // Use restored phi/theta if available as starting point, otherwise calculate from location
    let [currentPhi, currentTheta] = hasRestoredState
      ? [round3(search.phi as number), round3(search.theta as number)]
      : locationToPhiTheta(nextLocation.current);

    // Calculate target phi/theta for current location
    const [targetPhi, targetTheta] = locationToPhiTheta(nextLocation.current);

    // Check if restored values match target (skip animation if they do)
    const phiDiff = Math.abs(currentPhi - targetPhi);
    const thetaDiff = Math.abs(currentTheta - targetTheta);
    const phiWrapped = Math.min(phiDiff, DOUBLE_PI - phiDiff);
    const matchesTarget = phiWrapped < 0.01 && thetaDiff < 0.01;

    // Track if we've reached the target (for storing in URL)
    let hasReachedTarget = matchesTarget; // Only skip animation if already at target

    const globe = createGlobe(canvas, {
      baseColor: [1, 1, 1],
      dark: resolvedTheme === "dark" ? 1 : 0,
      devicePixelRatio: 2,
      diffuse: 0,
      glowColor:
        resolvedTheme === "dark" ? [0.2, 0.2, 0.2] : [0.95, 0.95, 0.95],
      height: width * 2,
      mapBrightness: 1.2,
      mapSamples: 14_000,
      markerColor: [251 / 255, 200 / 255, 21 / 255],
      markers: [],
      onRender: (state) => {
        state.markers = [
          {
            location: [nextLocation.current.lat, nextLocation.current.lng],
            size: 0.1,
          },
        ];
        state.phi = currentPhi;
        state.theta = currentTheta;

        aoeustnh; // Always animate to target unless we're already there
        if (hasReachedTarget) {
          // If at target, sync with target (should already be there)
          currentPhi = round3(targetPhi);
          currentTheta = round3(targetTheta);
        } else {
          // Calculate shortest rotation path
          const distributionPositive =
            (targetPhi - currentPhi + DOUBLE_PI) % DOUBLE_PI;
          const distributionNegative =
            (currentPhi - targetPhi + DOUBLE_PI) % DOUBLE_PI;

          // Smoothly rotate to target
          currentPhi = round3(
            currentPhi +
              (distributionPositive < distributionNegative
                ? distributionPositive
                : -distributionNegative) *
                0.08,
          );
          currentTheta = round3(currentTheta * 0.92 + targetTheta * 0.08);

          // Check if we've reached the target (within small threshold)
          const currentPhiDiff = Math.abs(currentPhi - targetPhi);
          const currentThetaDiff = Math.abs(currentTheta - targetTheta);
          const currentPhiWrapped = Math.min(
            currentPhiDiff,
            DOUBLE_PI - currentPhiDiff,
          );

          if (currentPhiWrapped < 0.01 && currentThetaDiff < 0.01) {
            hasReachedTarget = true;
            // Store phi/theta in URL for restoration (rounded to 3 decimals)
            navigate({
              to: ".",
              search: (prev) => ({
                ...prev,
                phi: round3(currentPhi),
                theta: round3(currentTheta),
              }),
              replace: true, // Don't create new history entry
            });
          }
        }

        state.width = width * 2;
        state.height = width * 2;
      },
      phi: currentPhi,
      scale: 1,
      theta: currentTheta,
      width: width * 2,
    });
    globeReference.current = globe;

    // // Handle opacity transition
    // setTimeout(() => {
    //   canvas.style.opacity = noLocation ? "0" : "1";
    // });

    return () => {
      window.removeEventListener("resize", setWidth);
    };
  }, [
    nextLocation,
    noLocation,
    resolvedTheme,
    hasRestoredState,
    search.phi,
    search.theta,
    navigate,
  ]);

  // When COBE unmounts on refresh you see a gross white flash - this makes sure
  // to animate out the canvas before that flash occurs
  // https://github.com/shuding/cobe/issues/84
  // useEffect(() => {
  //   const handleCleanup = () => {
  //     if (canvasRef.current) {
  //       canvasRef.current.style.opacity = "0";
  //     }
  //   };

  //   window.addEventListener("beforeunload", handleCleanup);

  //   return () => {
  //     handleCleanup();
  //     window.removeEventListener("beforeunload", handleCleanup);
  //   };
  // }, []);

  // Handle location updates
  useEffect(() => {
    if (!properties.location) {
      return;
    }

    const locationChanged =
      nextLocation.current.lat !== properties.location.lat ||
      nextLocation.current.lng !== properties.location.lng;

    if (locationChanged) {
      nextLocation.current = properties.location;
      // Clear phi/theta from URL when location changes (will animate to new location)
      navigate({
        to: ".",
        search: (prev) => {
          const {
            phi: _,
            theta: __,
            ...rest
          } = prev as { phi?: number; theta?: number; [key: string]: unknown };
          return rest;
        },
        replace: true,
      });
    }
  }, [properties.location, navigate]);

  return (
    <div className="relative aspect-square size-full">
      <canvas
        className={cn(
          "aspect-square size-full",
          // "opacity-0 transition-all duration-2000",
          "contain-[layout_paint_size]",
        )}
        ref={canvasReference}
      />
    </div>
  );
}
