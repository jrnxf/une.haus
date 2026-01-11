import { useCallback, useMemo, useState } from "react";

import type MapLibreGL from "maplibre-gl";

import {
  Map,
  MapClusterLayer,
  MapControls,
  MapPopup,
} from "~/components/ui/map";
import { UserPinPopup } from "~/components/user-pin-popup";
import { usersToGeoJSON } from "~/lib/location/geo-json";
import { useTheme } from "~/lib/theme/context";
import { type UsersWithLocationsData } from "~/lib/users";

type UserGlobeProps = {
  users: UsersWithLocationsData;
  initialCenter?: [number, number];
  initialZoom?: number;
  onMapMove?: (center: [number, number], zoom: number) => void;
};

type UserInPopup = {
  id: number;
  name: string;
  avatarId: string | null;
  label: string;
  countryCode: string | null;
};

type SelectedPoint = {
  coordinates: [number, number];
  users: UserInPopup[];
};

// Theme-aware colors for MapLibre (needs hex, not CSS variables)
const themeColors = {
  light: {
    clusters: ["#64748b", "#475569", "#334155"] as [string, string, string], // slate-500, 600, 700
    point: "#334155", // slate-700
  },
  dark: {
    water: "#18181b", // oklch(17% 0 0) - sidebar
    clusters: ["#94a3b8", "#64748b", "#475569"] as [string, string, string], // slate-400, 500, 600
    point: "#cbd5e1", // slate-300
  },
};

// Transform style to customize water color in dark mode (no flash)
function handleTransformStyle(
  style: MapLibreGL.StyleSpecification,
  theme: "light" | "dark",
): MapLibreGL.StyleSpecification {
  if (theme !== "dark") return style;

  return {
    ...style,
    layers: style.layers?.map((layer) => {
      if (layer.id === "water" && layer.type === "fill") {
        return {
          ...layer,
          paint: {
            ...layer.paint,
            "fill-color": themeColors.dark.water,
          },
        };
      }
      return layer;
    }),
  };
}

const DEFAULT_CENTER: [number, number] = [0, 20];
const DEFAULT_ZOOM = 1.5;

export function UserGlobe({
  users,
  initialCenter,
  initialZoom,
  onMapMove,
}: UserGlobeProps) {
  const { resolvedTheme } = useTheme();
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
    null,
  );

  const geoJSON = useMemo(() => usersToGeoJSON(users), [users]);
  const colors =
    resolvedTheme === "dark" ? themeColors.dark : themeColors.light;

  const handleMapLoad = useCallback(
    (map: MapLibreGL.Map) => {
      if (!onMapMove) return;

      // Skip the first moveend (initial load) to avoid replacing history entry
      let isFirstMove = true;

      const handleMoveEnd = () => {
        if (isFirstMove) {
          isFirstMove = false;
          return;
        }
        const center = map.getCenter();
        const zoom = map.getZoom();
        onMapMove([center.lng, center.lat], zoom);
      };

      map.on("moveend", handleMoveEnd);
    },
    [onMapMove],
  );

  const handlePointClick = useCallback(
    (
      feature: GeoJSON.Feature<GeoJSON.Point, GeoJSON.GeoJsonProperties>,
      coordinates: [number, number],
    ) => {
      // MapLibre serializes nested objects as JSON strings, so we need to parse them
      const usersData = feature.properties?.users;
      if (!usersData) return;

      const parsedUsers: UserInPopup[] =
        typeof usersData === "string" ? JSON.parse(usersData) : usersData;

      setSelectedPoint({
        coordinates,
        users: parsedUsers,
      });
    },
    [],
  );

  const handlePopupClose = useCallback(() => {
    setSelectedPoint(null);
  }, []);

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
  );
}
