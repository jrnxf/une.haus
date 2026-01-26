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

const locationToPhiTheta = ({ lat, lng }: Coordinates): [number, number] => {
  return [
    Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), // phi
    (lat * Math.PI) / 180 + THETA_OFFSET, // theta
  ];
};

export function Globe(props: { location: Coordinates | null | undefined }) {
  const canvasReference = useRef<HTMLCanvasElement>(null);

  const { resolvedTheme } = useTheme();
  const globeRef = useRef<null | ReturnType<typeof createGlobe>>(null);
  const noLocation = props.location === undefined;
  const nextLocation = useRef<Coordinates>(
    props.location ?? { lat: 0, lng: 0 },
  );
  const skipAnimation = useRef(false);

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

    let [currentPhi, currentTheta] = locationToPhiTheta(nextLocation.current);

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

        const [focusPhi, focusTheta] = locationToPhiTheta(nextLocation.current);

        // Skip animation on back navigation (popstate)
        if (skipAnimation.current) {
          currentPhi = focusPhi;
          currentTheta = focusTheta;
          skipAnimation.current = false;
        } else {
          // Calculate shortest rotation path
          const distributionPositive =
            (focusPhi - currentPhi + DOUBLE_PI) % DOUBLE_PI;
          const distributionNegative =
            (currentPhi - focusPhi + DOUBLE_PI) % DOUBLE_PI;

          // Smoothly rotate to target
          currentPhi +=
            (distributionPositive < distributionNegative
              ? distributionPositive
              : -distributionNegative) * 0.08;
          currentTheta = currentTheta * 0.92 + focusTheta * 0.08;
        }

        state.phi = currentPhi;
        state.theta = currentTheta;
        state.width = width * 2;
        state.height = width * 2;
      },
      phi: currentPhi,
      scale: 1,
      theta: currentTheta,
      width: width * 2,
    });
    globeRef.current = globe;

    // // Handle opacity transition
    // setTimeout(() => {
    //   canvas.style.opacity = noLocation ? "0" : "1";
    // });

    return () => {
      window.removeEventListener("resize", setWidth);
    };
  }, [nextLocation, noLocation, resolvedTheme]);

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

  // Update location ref synchronously during render (no useEffect needed for refs)
  if (
    props.location &&
    (nextLocation.current.lat !== props.location.lat ||
      nextLocation.current.lng !== props.location.lng)
  ) {
    nextLocation.current = props.location;
  }

  // Skip animation on back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      skipAnimation.current = true;
    };
    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="relative aspect-square size-full">
      <canvas
        className={cn(
          "aspect-square size-full",
          // "opacity-0 transition-all duration-2000",
          "[contain:layout_paint_size]",
        )}
        ref={canvasReference}
      />
    </div>
  );
}
