import createGlobe, { type Marker } from "cobe"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { StatusIndicator } from "~/components/ui/status"
import { UserPinPopup } from "~/components/user-pin-popup"
import { useTheme } from "~/lib/theme/context"
import { cn } from "~/lib/utils"

type MarkerUser = {
  id: number
  name: string
  avatarId: string | null
  label: string
  countryCode: string | null
}

type GlobeMarker = {
  location: [number, number]
  users: MarkerUser[]
}

type GlobeArc = {
  from: [number, number]
  to: [number, number]
}

type OverlayDot = {
  location: [number, number]
  /** CSS size class, e.g. "size-1.5" */
  sizeClass: string
  /** CSS color class, e.g. "bg-blue-500" */
  colorClass: string
  /** 0–1 opacity */
  opacity: number
}

type CobeGlobeProps = {
  markers?: GlobeMarker[]
  arcs?: GlobeArc[]
  dotMarkers?: Marker[]
  /** HTML overlay dots with real CSS opacity (supports translucent overlap). */
  overlayDots?: OverlayDot[]
  arcColor?: [number, number, number]
  /** Target [lat, lng] to smoothly rotate toward. Overrides auto-rotation. */
  focusTarget?: [number, number] | null
  /** Renders a pulsing green dot at this [lat, lng] using StatusIndicator. */
  pulseMarker?: [number, number] | null
}

/** Convert lat/lng to cobe's internal phi/theta rotation angles. */
function locationToAngles(
  lat: number,
  lng: number,
): { phi: number; theta: number } {
  return {
    phi: Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2),
    theta: (lat * Math.PI) / 180,
  }
}

/**
 * Project a lat/lng onto 2D screen space matching COBE's internal projection.
 * Derived from cobe's source: U() for lat/lng→3D, O() for 3D→screen.
 */
function projectToScreen(
  lat: number,
  lng: number,
  phi: number,
  theta: number,
  width: number,
  height: number,
): { x: number; y: number; visible: boolean } {
  // COBE's U(): lat/lng → 3D unit vector
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180 - Math.PI
  const cosLat = Math.cos(latRad)
  const px = -cosLat * Math.cos(lngRad) * 0.8
  const py = Math.sin(latRad) * 0.8
  const pz = cosLat * Math.sin(lngRad) * 0.8

  // COBE's O(): 3D → screen (scale=1, offset=[0,0])
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)

  const c = cosPhi * px + sinPhi * pz
  const s = sinPhi * sinTheta * px + cosTheta * py - cosPhi * sinTheta * pz
  const z = -sinPhi * cosTheta * px + sinTheta * py + cosPhi * cosTheta * pz

  const aspect = width / height

  return {
    x: width * ((c / aspect + 1) / 2),
    y: height * ((-s + 1) / 2),
    visible: z >= 0,
  }
}

export function CobeGlobe({
  markers,
  arcs,
  dotMarkers,
  overlayDots,
  arcColor,
  focusTarget,
  pulseMarker,
}: CobeGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null)
  const animFrameRef = useRef<number>(0)
  const pointerInteracting = useRef(false)
  const pointerStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const initialAngles = focusTarget
    ? locationToAngles(focusTarget[0], focusTarget[1])
    : null
  const phiRef = useRef(initialAngles?.phi ?? 0)
  const thetaRef = useRef(initialAngles?.theta ?? 0.2)
  const velocityRef = useRef({ phi: 0, theta: 0 })
  const markerElsRef = useRef<(HTMLButtonElement | null)[]>([])
  const overlayDotElsRef = useRef<(HTMLDivElement | null)[]>([])
  const sizeRef = useRef({ width: 0, height: 0 })
  const arcsRef = useRef(arcs)
  arcsRef.current = arcs
  const dotMarkersRef = useRef(dotMarkers)
  dotMarkersRef.current = dotMarkers
  const overlayDotsRef = useRef(overlayDots)
  overlayDotsRef.current = overlayDots
  const focusTargetRef = useRef(focusTarget)
  focusTargetRef.current = focusTarget
  const pulseMarkerRef = useRef(pulseMarker)
  pulseMarkerRef.current = pulseMarker
  const pulseElRef = useRef<HTMLDivElement | null>(null)
  const [openMarkerIndex, setOpenMarkerIndex] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const { resolvedTheme } = useTheme()

  const isDark = resolvedTheme === "dark"

  const updateMarkerPositions = useCallback(() => {
    const { width, height } = sizeRef.current
    if (width === 0) return

    if (markers) {
      for (let i = 0; i < markers.length; i++) {
        const el = markerElsRef.current[i]
        if (!el) continue

        const [lat, lng] = markers[i].location
        const { x, y, visible } = projectToScreen(
          lat,
          lng,
          phiRef.current,
          thetaRef.current,
          width,
          height,
        )

        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
        el.style.opacity = visible ? "1" : "0"
        el.style.pointerEvents = visible ? "auto" : "none"
      }
    }

    const dots = overlayDotsRef.current
    if (dots) {
      for (let i = 0; i < dots.length; i++) {
        const el = overlayDotElsRef.current[i]
        if (!el) continue

        const [lat, lng] = dots[i].location
        const { x, y, visible } = projectToScreen(
          lat,
          lng,
          phiRef.current,
          thetaRef.current,
          width,
          height,
        )

        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
        el.style.opacity = visible ? String(dots[i].opacity) : "0"
      }
    }

    const pm = pulseMarkerRef.current
    const pulseEl = pulseElRef.current
    if (pm && pulseEl) {
      const { x, y, visible } = projectToScreen(
        pm[0],
        pm[1],
        phiRef.current,
        thetaRef.current,
        width,
        height,
      )
      pulseEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
      pulseEl.style.opacity = visible ? "1" : "0"
    }
  }, [markers])

  const buildGlobe = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    cancelAnimationFrame(animFrameRef.current)
    globeRef.current?.destroy()

    const width = container.clientWidth
    const height = container.clientHeight
    const dpr = window.devicePixelRatio || 1
    sizeRef.current = { width, height }

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: height * dpr,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: isDark ? 1 : 0,
      diffuse: 3,
      mapSamples: 40_000,
      mapBrightness: isDark ? 2 : 0.8,
      baseColor: isDark ? [0.15, 0.15, 0.15] : [1, 1, 1],
      markerColor: isDark ? [0.4, 0.6, 1] : [0.1, 0.1, 0.1],
      glowColor: isDark ? [0.15, 0.15, 0.15] : [1, 1, 1],
      markers: dotMarkersRef.current,
      markerElevation: 0,
      arcs: arcsRef.current,
      arcColor: arcColor ?? (isDark ? [0.3, 0.5, 1] : [0.1, 0.3, 0.8]),
    })

    globeRef.current = globe
    let signaled = false

    function animate() {
      const target = focusTargetRef.current
      if (target && !pointerInteracting.current) {
        const { phi: targetPhi, theta: targetTheta } = locationToAngles(
          target[0],
          target[1],
        )

        // Shortest-path phi delta (handles wrapping around 2π)
        const doublePi = Math.PI * 2
        const distPositive = (targetPhi - phiRef.current + doublePi) % doublePi
        const distNegative = (phiRef.current - targetPhi + doublePi) % doublePi
        if (distPositive < distNegative) {
          phiRef.current += distPositive * 0.06
        } else {
          phiRef.current -= distNegative * 0.06
        }
        thetaRef.current = thetaRef.current * 0.94 + targetTheta * 0.06
      } else if (!pointerInteracting.current) {
        phiRef.current += 0.001
      }

      phiRef.current += velocityRef.current.phi
      thetaRef.current += velocityRef.current.theta

      thetaRef.current = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, thetaRef.current),
      )

      velocityRef.current.phi *= 0.95
      velocityRef.current.theta *= 0.95

      if (Math.abs(velocityRef.current.phi) < 0.0001) {
        velocityRef.current.phi = 0
      }
      if (Math.abs(velocityRef.current.theta) < 0.0001) {
        velocityRef.current.theta = 0
      }

      globe.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        arcs: arcsRef.current,
        markers: dotMarkersRef.current,
      })
      updateMarkerPositions()
      if (!signaled) {
        signaled = true
        setReady(true)
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }, [isDark, arcColor, updateMarkerPositions])

  useEffect(() => {
    buildGlobe()
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      globeRef.current?.destroy()
      globeRef.current = null
    }
  }, [buildGlobe])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let timeout: ReturnType<typeof setTimeout>
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout)
      timeout = setTimeout(buildGlobe, 150)
    })

    observer.observe(container)
    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [buildGlobe])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointerInteracting.current = true
      pointerStart.current = { x: e.clientX, y: e.clientY }
      velocityRef.current = { phi: 0, theta: 0 }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointerInteracting.current) return

      const dx = e.clientX - pointerStart.current.x
      const dy = e.clientY - pointerStart.current.y

      const sensitivity = 0.005
      phiRef.current += dx * sensitivity
      thetaRef.current -= dy * sensitivity
      thetaRef.current = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, thetaRef.current),
      )

      velocityRef.current.phi = dx * sensitivity
      velocityRef.current.theta = -dy * sensitivity

      pointerStart.current = { x: e.clientX, y: e.clientY }
    },
    [],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointerInteracting.current = false
      e.currentTarget.releasePointerCapture(e.pointerId)
    },
    [],
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full transition-[opacity,scale] duration-500 ease-out",
        ready ? "scale-100 opacity-100" : "scale-[0.92] opacity-0",
      )}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {ready && markers && markers.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {markers.map((marker, i) => (
            <Popover
              key={`${marker.location[0]}-${marker.location[1]}`}
              open={openMarkerIndex === i}
              onOpenChange={(open) => setOpenMarkerIndex(open ? i : null)}
            >
              <PopoverTrigger
                ref={(el: HTMLButtonElement | null) => {
                  markerElsRef.current[i] = el
                }}
                className={cn(
                  "pointer-events-auto absolute top-0 left-0 flex cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity duration-200",
                  marker.users.length > 1
                    ? "bg-primary/80 text-primary-foreground size-6 text-xs font-medium"
                    : "bg-primary/80 size-3",
                )}
              >
                {marker.users.length > 1 ? marker.users.length : null}
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-4">
                <UserPinPopup users={marker.users} />
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )}
      {ready && overlayDots && overlayDots.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {overlayDots.map((dot, i) => (
            <div
              key={`${dot.location[0]}-${dot.location[1]}`}
              ref={(el: HTMLDivElement | null) => {
                overlayDotElsRef.current[i] = el
              }}
              className={cn(
                "absolute top-0 left-0 rounded-full opacity-0",
                dot.sizeClass,
                dot.colorClass,
              )}
            />
          ))}
        </div>
      )}
      {ready && pulseMarker && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            ref={pulseElRef}
            className="absolute top-0 left-0 opacity-0 transition-opacity duration-200"
          >
            <StatusIndicator className="bg-green-500" />
          </div>
        </div>
      )}
    </div>
  )
}
