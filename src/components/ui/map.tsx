import { Loader2, Locate, Maximize, Minus, Plus, XIcon } from "lucide-react"
import MapLibreGL, { type PopupOptions } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import {
  createContext,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"

import { Button } from "~/components/ui/button"
import { useTheme } from "~/lib/theme/context"
import { cn } from "~/lib/utils"

type MapContextValue = {
  map: MapLibreGL.Map | null
  isLoaded: boolean
}

const MapContext = createContext<MapContextValue | null>(null)

function useMap() {
  const context = useContext(MapContext)
  if (!context) {
    throw new Error("useMap must be used within a Map component")
  }
  return context
}

const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
}

type MapStyleOption = string | MapLibreGL.StyleSpecification

type MapProps = {
  children?: ReactNode
  /** Additional CSS classes for the outer wrapper */
  className?: string
  /** Custom map styles for light and dark themes. Overrides the default Carto styles. */
  styles?: {
    light?: MapStyleOption
    dark?: MapStyleOption
  }
  /** Transform the style before it's applied. Useful for modifying layer colors. */
  transformStyle?: (
    style: MapLibreGL.StyleSpecification,
    theme: "light" | "dark",
  ) => MapLibreGL.StyleSpecification
  /** Map projection type. Use `{ type: "globe" }` for 3D globe view. */
  projection?: MapLibreGL.ProjectionSpecification
  /** Callback when map is fully loaded and ready for customization */
  onLoad?: (map: MapLibreGL.Map) => void
} & Omit<MapLibreGL.MapOptions, "container" | "style">

type MapRef = MapLibreGL.Map

// Helper to fetch and transform a style
async function fetchAndTransformStyle(
  styleUrl: string,
  theme: "light" | "dark",
  transformStyle?: MapProps["transformStyle"],
): Promise<MapLibreGL.StyleSpecification> {
  const response = await fetch(styleUrl)
  const style = (await response.json()) as MapLibreGL.StyleSpecification
  return transformStyle ? transformStyle(style, theme) : style
}

const Map = forwardRef<MapRef, MapProps>(function Map(
  { children, className, styles, transformStyle, projection, onLoad, ...props },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const { resolvedTheme } = useTheme()
  const currentThemeRef = useRef<"light" | "dark" | null>(null)

  const propsRef = useRef(props)
  propsRef.current = props

  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad

  // Use a ref for resolved theme so the init effect doesn't re-run on theme change.
  // Theme switches are handled by the separate style-swap effect below.
  const resolvedThemeRef = useRef(resolvedTheme)
  resolvedThemeRef.current = resolvedTheme

  const mapStyles = useMemo(
    () => ({
      dark: styles?.dark ?? defaultStyles.dark,
      light: styles?.light ?? defaultStyles.light,
    }),
    [styles],
  )

  useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance])

  const projectionRef = useRef(projection)
  projectionRef.current = projection

  // Initialize map with potentially transformed style
  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    let map: MapLibreGL.Map | null = null

    const theme = (resolvedThemeRef.current === "dark" ? "dark" : "light") as
      | "light"
      | "dark"
    const styleOption = theme === "dark" ? mapStyles.dark : mapStyles.light
    currentThemeRef.current = theme

    const initMap = async () => {
      let style: MapStyleOption = styleOption

      // If it's a URL and we have a transform function, fetch and transform
      if (typeof styleOption === "string" && transformStyle) {
        style = await fetchAndTransformStyle(styleOption, theme, transformStyle)
      }

      if (cancelled) return

      map = new MapLibreGL.Map({
        container: containerRef.current!,
        style,
        renderWorldCopies: false,
        attributionControl: {
          compact: true,
        },
        ...propsRef.current,
      })

      const loadHandler = () => {
        if (projectionRef.current) {
          map?.setProjection(projectionRef.current)
        }
        setIsLoaded(true)
        onLoadRef.current?.(map!)
      }

      map.on("load", loadHandler)
      setMapInstance(map)
    }

    initMap()

    return () => {
      cancelled = true
      if (map) {
        map.remove()
        setIsLoaded(false)
        setMapInstance(null)
      }
    }
  }, [mapStyles.dark, mapStyles.light, transformStyle])

  // Handle theme changes
  useEffect(() => {
    if (!mapInstance || !resolvedTheme) return

    const theme = (resolvedTheme === "dark" ? "dark" : "light") as
      | "light"
      | "dark"
    if (currentThemeRef.current === theme) return
    currentThemeRef.current = theme

    const styleOption = theme === "dark" ? mapStyles.dark : mapStyles.light

    const applyStyle = async () => {
      let style: MapStyleOption = styleOption

      if (typeof styleOption === "string" && transformStyle) {
        style = await fetchAndTransformStyle(styleOption, theme, transformStyle)
      }

      const handleStyleLoad = () => {
        if (projectionRef.current) {
          mapInstance.setProjection(projectionRef.current)
        }
        onLoadRef.current?.(mapInstance)
      }

      mapInstance.once("style.load", handleStyleLoad)
      mapInstance.setStyle(style, { diff: false })
    }

    applyStyle()
  }, [mapInstance, resolvedTheme, mapStyles, transformStyle])

  const contextValue = useMemo(
    () => ({
      map: mapInstance,
      isLoaded,
    }),
    [mapInstance, isLoaded],
  )

  return (
    <MapContext.Provider value={contextValue}>
      <div className={cn("relative h-full w-full font-mono", className)}>
        <div ref={containerRef} className="h-full w-full">
          {mapInstance && children}
        </div>
      </div>
    </MapContext.Provider>
  )
})

type MapControlsProps = {
  /** Position of the controls on the map (default: "bottom-right") */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  /** Show zoom in/out buttons (default: true) */
  showZoom?: boolean
  /** Show locate button to find user's location (default: false) */
  showLocate?: boolean
  /** Show fullscreen toggle button (default: false) */
  showFullscreen?: boolean
  /** Additional CSS classes for the controls container */
  className?: string
  /** Callback with user coordinates when located */
  onLocate?: (coords: { longitude: number; latitude: number }) => void
}

const positionClasses = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-10 right-2",
}

function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border bg-background [&>button:not(:last-child)]:border-border flex flex-col overflow-hidden rounded-md border shadow-sm [&>button:not(:last-child)]:border-b">
      {children}
    </div>
  )
}

function ControlButton({
  onClick,
  label,
  children,
  disabled = false,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      type="button"
      className={cn(
        "hover:bg-accent dark:hover:bg-accent/40 flex size-8 items-center justify-center transition-colors",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
      )}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function MapControls({
  position = "bottom-right",
  showZoom = true,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
}: MapControlsProps) {
  const { map, isLoaded } = useMap()
  const [waitingForLocation, setWaitingForLocation] = useState(false)

  const handleZoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 })
  }, [map])

  const handleZoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 })
  }, [map])

  const handleLocate = useCallback(() => {
    setWaitingForLocation(true)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
          }
          map?.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: 14,
            duration: 1500,
          })
          onLocate?.(coords)
          setWaitingForLocation(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          setWaitingForLocation(false)
        },
      )
    }
  }, [map, onLocate])

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer()
    if (!container) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [map])

  if (!isLoaded) return null

  return (
    <div
      className={cn(
        "absolute z-10 flex flex-col gap-1.5",
        positionClasses[position],
        className,
      )}
    >
      {showZoom && (
        <ControlGroup>
          <ControlButton onClick={handleZoomIn} label="Zoom in">
            <Plus className="size-4" />
          </ControlButton>
          <ControlButton onClick={handleZoomOut} label="Zoom out">
            <Minus className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}
      {showLocate && (
        <ControlGroup>
          <ControlButton
            onClick={handleLocate}
            label="Find my location"
            disabled={waitingForLocation}
          >
            {waitingForLocation ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Locate className="size-4" />
            )}
          </ControlButton>
        </ControlGroup>
      )}
      {showFullscreen && (
        <ControlGroup>
          <ControlButton onClick={handleFullscreen} label="Toggle fullscreen">
            <Maximize className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}
    </div>
  )
}

type MapPopupProps = {
  /** Longitude coordinate for popup position */
  longitude: number
  /** Latitude coordinate for popup position */
  latitude: number
  /** Callback when popup is closed */
  onClose?: () => void
  /** Popup content */
  children: ReactNode
  /** Additional CSS classes for the popup container */
  className?: string
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean
} & Omit<PopupOptions, "className" | "closeButton">

function MapPopup({
  longitude,
  latitude,
  onClose,
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MapPopupProps) {
  const { map } = useMap()
  const popupOptionsRef = useRef(popupOptions)
  const container = useMemo(() => document.createElement("div"), [])

  const popup = useMemo(() => {
    const popupInstance = new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth("none")
      .setLngLat([longitude, latitude])

    return popupInstance
    // oxlint-disable-next-line react/exhaustive-deps -- popup created once on mount
  }, [])

  useEffect(() => {
    if (!map) return

    const onCloseProp = () => onClose?.()
    popup.on("close", onCloseProp)

    popup.setDOMContent(container)
    popup.addTo(map)

    return () => {
      popup.off("close", onCloseProp)
      if (popup.isOpen()) {
        popup.remove()
      }
    }
    // oxlint-disable-next-line react/exhaustive-deps -- popup attach/detach depends only on map
  }, [map])

  if (popup.isOpen()) {
    const prev = popupOptionsRef.current

    if (
      popup.getLngLat().lng !== longitude ||
      popup.getLngLat().lat !== latitude
    ) {
      popup.setLngLat([longitude, latitude])
    }

    if (prev.offset !== popupOptions.offset) {
      popup.setOffset(popupOptions.offset ?? 16)
    }
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      popup.setMaxWidth(popupOptions.maxWidth ?? "none")
    }
    popupOptionsRef.current = popupOptions
  }

  const handleClose = () => {
    popup.remove()
    onClose?.()
  }

  return createPortal(
    <div
      className={cn(
        "fade-in-0 zoom-in-95 animate-in bg-popover text-popover-foreground relative rounded-md border p-3 shadow-md",
        className,
      )}
    >
      {closeButton && (
        <Button
          type="button"
          onClick={handleClose}
          variant="ghost"
          size="icon-xs"
          aria-label="close popup"
          className="absolute top-0 right-0"
        >
          <XIcon className="size-3" />
          <span className="sr-only">close</span>
        </Button>
      )}
      {children}
    </div>,
    container,
  )
}

type MapClusterLayerProps<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties,
> = {
  /** GeoJSON FeatureCollection data or URL to fetch GeoJSON from */
  data: string | GeoJSON.FeatureCollection<GeoJSON.Point, P>
  /** Maximum zoom level to cluster points on (default: 14) */
  clusterMaxZoom?: number
  /** Radius of each cluster when clustering points in pixels (default: 50) */
  clusterRadius?: number
  /** Colors for cluster circles: [small, medium, large] based on point count (default: ["#51bbd6", "#f1f075", "#f28cb1"]) */
  clusterColors?: [string, string, string]
  /** Point count thresholds for color/size steps: [medium, large] (default: [100, 750]) */
  clusterThresholds?: [number, number]
  /** Circle radius for cluster sizes: [small, medium, large] in pixels (default: [20, 30, 40]) */
  clusterSizes?: [number, number, number]
  /** Color for unclustered individual points (default: "#3b82f6") */
  pointColor?: string
  /** Callback when an unclustered point is clicked */
  onPointClick?: (
    feature: GeoJSON.Feature<GeoJSON.Point, P>,
    coordinates: [number, number],
  ) => void
  /** Callback when a cluster is clicked. If not provided, zooms into the cluster */
  onClusterClick?: (
    clusterId: number,
    coordinates: [number, number],
    pointCount: number,
  ) => void
}

function MapClusterLayer<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties,
>({
  data,
  clusterMaxZoom = 14,
  clusterRadius = 50,
  clusterColors = ["#51bbd6", "#f1f075", "#f28cb1"],
  clusterThresholds = [100, 750],
  clusterSizes = [20, 30, 40],
  pointColor = "#3b82f6",
  onPointClick,
  onClusterClick,
}: MapClusterLayerProps<P>) {
  const { map, isLoaded } = useMap()
  const id = useId()
  const sourceId = `cluster-source-${id}`
  const clusterLayerId = `clusters-${id}`
  const clusterCountLayerId = `cluster-count-${id}`
  const unclusteredLayerId = `unclustered-point-${id}`

  const stylePropsRef = useRef({
    clusterColors,
    clusterThresholds,
    clusterSizes,
    pointColor,
  })

  // Store latest data ref for use in style.load handler
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // Function to add source and layers
  const addSourceAndLayers = useCallback(() => {
    if (!map) return

    // Remove existing if present (for style changes)
    try {
      if (map.getLayer(clusterCountLayerId))
        map.removeLayer(clusterCountLayerId)
      if (map.getLayer(unclusteredLayerId)) map.removeLayer(unclusteredLayerId)
      if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    } catch {
      // ignore
    }

    // Add clustered GeoJSON source
    map.addSource(sourceId, {
      type: "geojson",
      data: dataRef.current,
      cluster: true,
      clusterMaxZoom,
      clusterRadius,
    })

    const currentProps = stylePropsRef.current

    // Add cluster circles layer
    map.addLayer({
      id: clusterLayerId,
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          currentProps.clusterColors[0],
          currentProps.clusterThresholds[0],
          currentProps.clusterColors[1],
          currentProps.clusterThresholds[1],
          currentProps.clusterColors[2],
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          currentProps.clusterSizes[0],
          currentProps.clusterThresholds[0],
          currentProps.clusterSizes[1],
          currentProps.clusterThresholds[1],
          currentProps.clusterSizes[2],
        ],
      },
    })

    // Add cluster count text layer
    map.addLayer({
      id: clusterCountLayerId,
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12,
      },
      paint: {
        "text-color": "#fff",
      },
    })

    // Add unclustered point layer
    map.addLayer({
      id: unclusteredLayerId,
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": currentProps.pointColor,
        "circle-radius": 6,
      },
    })
  }, [
    map,
    sourceId,
    clusterLayerId,
    clusterCountLayerId,
    unclusteredLayerId,
    clusterMaxZoom,
    clusterRadius,
  ])

  // Add source and layers on mount and re-add on style changes
  useEffect(() => {
    if (!isLoaded || !map) return

    // Add initially
    addSourceAndLayers()

    // Re-add after style changes (theme switch)
    const handleStyleLoad = () => {
      addSourceAndLayers()
    }

    map.on("style.load", handleStyleLoad)

    return () => {
      map.off("style.load", handleStyleLoad)
      try {
        if (map.getLayer(clusterCountLayerId))
          map.removeLayer(clusterCountLayerId)
        if (map.getLayer(unclusteredLayerId))
          map.removeLayer(unclusteredLayerId)
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch {
        // ignore
      }
    }
  }, [
    isLoaded,
    map,
    sourceId,
    clusterLayerId,
    clusterCountLayerId,
    unclusteredLayerId,
    addSourceAndLayers,
  ])

  // Update source data when data prop changes (only for non-URL data)
  useEffect(() => {
    if (!isLoaded || !map || typeof data === "string") return

    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource
    if (source) {
      source.setData(data)
    }
  }, [isLoaded, map, data, sourceId])

  // Update layer styles when props change
  useEffect(() => {
    if (!isLoaded || !map || !map.getStyle()) return

    const prev = stylePropsRef.current
    const colorsChanged =
      prev.clusterColors !== clusterColors ||
      prev.clusterThresholds !== clusterThresholds ||
      prev.clusterSizes !== clusterSizes

    // Update cluster layer colors and sizes
    if (map.getLayer(clusterLayerId) && colorsChanged) {
      map.setPaintProperty(clusterLayerId, "circle-color", [
        "step",
        ["get", "point_count"],
        clusterColors[0],
        clusterThresholds[0],
        clusterColors[1],
        clusterThresholds[1],
        clusterColors[2],
      ])
      map.setPaintProperty(clusterLayerId, "circle-radius", [
        "step",
        ["get", "point_count"],
        clusterSizes[0],
        clusterThresholds[0],
        clusterSizes[1],
        clusterThresholds[1],
        clusterSizes[2],
      ])
    }

    // Update unclustered point layer color
    if (map.getLayer(unclusteredLayerId) && prev.pointColor !== pointColor) {
      map.setPaintProperty(unclusteredLayerId, "circle-color", pointColor)
    }

    stylePropsRef.current = {
      clusterColors,
      clusterThresholds,
      clusterSizes,
      pointColor,
    }
  }, [
    isLoaded,
    map,
    clusterLayerId,
    unclusteredLayerId,
    clusterColors,
    clusterThresholds,
    clusterSizes,
    pointColor,
  ])

  // Handle click events
  useEffect(() => {
    if (!isLoaded || !map) return

    // Cluster click handler - zoom into cluster
    const handleClusterClick = async (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[]
      },
    ) => {
      e.originalEvent?.stopPropagation()

      const features = map.queryRenderedFeatures(e.point, {
        layers: [clusterLayerId],
      })
      if (features.length === 0) return

      const feature = features[0]
      const clusterId = feature.properties?.cluster_id as number
      const pointCount = feature.properties?.point_count as number
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ]

      if (onClusterClick) {
        onClusterClick(clusterId, coordinates, pointCount)
      } else {
        // Default behavior: zoom to cluster expansion zoom
        try {
          const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource
          if (!source) return
          const zoom = await source.getClusterExpansionZoom(clusterId)
          if (zoom != null) {
            map.easeTo({
              center: coordinates,
              zoom,
            })
          }
        } catch {
          // If cluster expansion fails, zoom in by 2 levels as fallback
          map.easeTo({
            center: coordinates,
            zoom: Math.min(map.getZoom() + 2, map.getMaxZoom() ?? 22),
          })
        }
      }
    }

    // Unclustered point click handler
    const handlePointClick = (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[]
      },
    ) => {
      e.originalEvent?.stopPropagation()

      if (!onPointClick || e.features?.length === 0) return

      const feature = e.features![0]
      const coordinates = [
        ...(feature.geometry as GeoJSON.Point).coordinates,
      ] as [number, number]

      // Handle world copies
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
      }

      onPointClick(
        feature as unknown as GeoJSON.Feature<GeoJSON.Point, P>,
        coordinates,
      )
    }

    // Cursor style handlers
    const handleMouseEnterCluster = () => {
      map.getCanvas().style.cursor = "pointer"
    }
    const handleMouseLeaveCluster = () => {
      map.getCanvas().style.cursor = ""
    }
    const handleMouseEnterPoint = () => {
      if (onPointClick) {
        map.getCanvas().style.cursor = "pointer"
      }
    }
    const handleMouseLeavePoint = () => {
      map.getCanvas().style.cursor = ""
    }

    map.on("click", clusterLayerId, handleClusterClick)
    map.on("click", unclusteredLayerId, handlePointClick)
    map.on("mouseenter", clusterLayerId, handleMouseEnterCluster)
    map.on("mouseleave", clusterLayerId, handleMouseLeaveCluster)
    map.on("mouseenter", unclusteredLayerId, handleMouseEnterPoint)
    map.on("mouseleave", unclusteredLayerId, handleMouseLeavePoint)

    return () => {
      map.off("click", clusterLayerId, handleClusterClick)
      map.off("click", unclusteredLayerId, handlePointClick)
      map.off("mouseenter", clusterLayerId, handleMouseEnterCluster)
      map.off("mouseleave", clusterLayerId, handleMouseLeaveCluster)
      map.off("mouseenter", unclusteredLayerId, handleMouseEnterPoint)
      map.off("mouseleave", unclusteredLayerId, handleMouseLeavePoint)
    }
  }, [
    isLoaded,
    map,
    clusterLayerId,
    unclusteredLayerId,
    sourceId,
    onClusterClick,
    onPointClick,
  ])

  return null
}

export { Map, MapClusterLayer, MapControls, MapPopup }
