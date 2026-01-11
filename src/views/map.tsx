import { UserGlobe } from "~/components/user-globe";
import { type UsersWithLocationsData } from "~/lib/users";

type MapViewProps = {
  users: UsersWithLocationsData;
  initialCenter?: [number, number];
  initialZoom?: number;
  onMapMove?: (center: [number, number], zoom: number) => void;
};

export function MapView({
  users,
  initialCenter,
  initialZoom,
  onMapMove,
}: MapViewProps) {
  if (users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">no users with locations found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-h-0">
      <UserGlobe
        users={users}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        onMapMove={onMapMove}
      />
    </div>
  );
}
