import { type UsersWithLocationsData } from "~/lib/users";

type UserWithLocation = UsersWithLocationsData[number];

type UserProperties = {
  id: number;
  name: string;
  avatarId: string | null;
  label: string;
  countryCode: string | null;
};

type LocationFeatureProperties = {
  users: UserProperties[];
  count: number;
  label: string;
};

export type LocationGeoJSON = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  LocationFeatureProperties
>;

/**
 * Convert user location data to GeoJSON format for clustering.
 * Groups users with identical coordinates into single points.
 */
export function usersToGeoJSON(users: UserWithLocation[]): LocationGeoJSON {
  const grouped = new Map<string, UserWithLocation[]>();

  for (const user of users) {
    const key = `${user.location.lng},${user.location.lat}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(user);
    } else {
      grouped.set(key, [user]);
    }
  }

  return {
    type: "FeatureCollection",
    features: Array.from(grouped.entries()).map(([coords, groupedUsers]) => {
      const [lng, lat] = coords.split(",").map(Number);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [lng, lat] as [number, number],
        },
        properties: {
          users: groupedUsers.map((u) => ({
            id: u.id,
            name: u.name,
            avatarId: u.avatarId,
            label: u.location.label,
            countryCode: u.location.countryCode,
          })),
          count: groupedUsers.length,
          label: groupedUsers[0]!.location.label,
        },
      };
    }),
  };
}
