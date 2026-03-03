import { useCallback, useMemo, useState } from "react"

import {
  Map,
  MapClusterLayer,
  MapControls,
  MapPopup,
} from "~/components/ui/map"
import { UserPinPopup } from "~/components/user-pin-popup"
import { usersToGeoJSON } from "~/lib/location/geo-json"
import { useTheme } from "~/lib/theme/context"
import { type UsersWithLocationsData } from "~/lib/users"

import type MapLibreGL from "maplibre-gl"

type UserGlobeProps = {
  users: UsersWithLocationsData
  initialCenter?: [number, number]
  initialZoom?: number
  onMapMove?: (center: [number, number], zoom: number) => void
}

type UserInPopup = {
  id: number
  name: string
  avatarId: string | null
  label: string
  countryCode: string | null
}

type SelectedPoint = {
  coordinates: [number, number]
  users: UserInPopup[]
}

// Theme-aware colors for MapLibre (needs hex, not CSS variables)
const themeColors = {
  light: {
    clusters: ["#d4d4d4", "#a3a3a3", "#737373"] as [string, string, string], // neutral-300, 400, 500
    point: "#a3a3a3", // neutral-400
    text: "#737373", // neutral-500
    textHalo: "#ffffff", // white
  },
  dark: {
    water: "#000000", // background: oklch(0 0 0)
    land: "#0f0f0f", // sidebar: oklch(17% 0 0)
    boundary: "#222222", // border: oklch(0.25 0 0)
    clusters: ["#737373", "#525252", "#404040"] as [string, string, string], // neutral-500, 600, 700
    point: "#a3a3a3", // neutral-400
    text: "#a3a3a3", // neutral-400
    textHalo: "#000000", // black
  },
}

// Transform style to customize colors (water in dark mode, text labels in both)
function handleTransformStyle(
  style: MapLibreGL.StyleSpecification,
  theme: "light" | "dark",
): MapLibreGL.StyleSpecification {
  const colors = theme === "dark" ? themeColors.dark : themeColors.light

  return {
    ...style,
    layers: style.layers?.map((layer) => {
      // Dark-mode-only overrides
      if (theme === "dark") {
        if (layer.id === "water" && layer.type === "fill") {
          return {
            ...layer,
            paint: { ...layer.paint, "fill-color": themeColors.dark.water },
          }
        }
        if (layer.id === "background" && layer.type === "background") {
          return {
            ...layer,
            paint: {
              ...layer.paint,
              "background-color": themeColors.dark.land,
            },
          }
        }
        if (
          (layer.id === "boundary_country_inner" ||
            layer.id === "boundary_country_outline") &&
          layer.type === "line"
        ) {
          return {
            ...layer,
            paint: {
              ...layer.paint,
              "line-color": themeColors.dark.boundary,
            },
          }
        }
      }

      // Neutralize text labels in both themes
      if (layer.type === "symbol") {
        return {
          ...layer,
          paint: {
            ...layer.paint,
            "text-color": colors.text,
            "text-halo-color": colors.textHalo,
          },
        }
      }

      return layer
    }),
  }
}

const DEFAULT_CENTER: [number, number] = [0, 20]
const DEFAULT_ZOOM = 1.2

export function UserGlobe({
  users,
  initialCenter,
  initialZoom,
  onMapMove,
}: UserGlobeProps) {
  const { resolvedTheme } = useTheme()
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null)

  const geoJSON = useMemo(() => usersToGeoJSON(users), [users])
  const colors = resolvedTheme === "dark" ? themeColors.dark : themeColors.light

  const handleMapLoad = useCallback(
    (map: MapLibreGL.Map) => {
      if (!onMapMove) return

      // Skip the first moveend (initial load) to avoid replacing history entry
      let isFirstMove = true

      const handleMoveEnd = () => {
        if (isFirstMove) {
          isFirstMove = false
          return
        }
        const center = map.getCenter()
        const zoom = map.getZoom()
        onMapMove([center.lng, center.lat], zoom)
      }

      map.on("moveend", handleMoveEnd)
    },
    [onMapMove],
  )

  const handlePointClick = useCallback(
    (
      feature: GeoJSON.Feature<GeoJSON.Point, GeoJSON.GeoJsonProperties>,
      coordinates: [number, number],
    ) => {
      // MapLibre serializes nested objects as JSON strings, so we need to parse them
      const usersData = feature.properties?.users
      if (!usersData) return

      const parsedUsers: UserInPopup[] =
        typeof usersData === "string" ? JSON.parse(usersData) : usersData

      setSelectedPoint({
        coordinates,
        users: parsedUsers,
      })
    },
    [],
  )

  const handlePopupClose = useCallback(() => {
    setSelectedPoint(null)
  }, [])

  return (
    <Map
      center={initialCenter ?? DEFAULT_CENTER}
      zoom={initialZoom ?? DEFAULT_ZOOM}
      maxZoom={12}
      minZoom={1}
      fadeDuration={0}
      transformStyle={handleTransformStyle}
      onLoad={handleMapLoad}
    >
      <MapClusterLayer
        data={geoJSON}
        clusterRadius={50}
        clusterMaxZoom={10}
        clusterColors={colors.clusters}
        clusterSizes={[14, 20, 28]}
        clusterThresholds={[10, 50]}
        pointColor={colors.point}
        onPointClick={handlePointClick}
      />
      <MapControls position="bottom-right" showZoom showCompass />

      {selectedPoint && (
        <MapPopup
          longitude={selectedPoint.coordinates[0]}
          latitude={selectedPoint.coordinates[1]}
          onClose={handlePopupClose}
          closeButton
          anchor="bottom"
          offset={12}
        >
          <UserPinPopup users={selectedPoint.users} />
        </MapPopup>
      )}
    </Map>
  )
}
