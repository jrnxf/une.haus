import { Map, MapControls, MapPopup } from "~/components/ui/map"

// Loaded only on demand from the rare section, since maplibre is large.
export function MapSample() {
  return (
    <div className="h-64 overflow-hidden rounded-md border">
      <Map center={[-9.14, 38.72]} zoom={3}>
        <MapControls showZoom showFullscreen />
        <MapPopup longitude={-9.14} latitude={38.72} closeButton={false}>
          <p className="text-sm">a map popup</p>
        </MapPopup>
      </Map>
    </div>
  )
}
