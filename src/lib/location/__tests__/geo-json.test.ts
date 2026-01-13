import { describe, it, expect } from "vitest";

import { usersToGeoJSON } from "../geo-json";

// Mock user data type matching UsersWithLocationsData
type MockUser = {
  id: number;
  name: string;
  avatarId: string | null;
  location: {
    lng: number;
    lat: number;
    label: string;
    countryCode: string;
  };
};

describe("usersToGeoJSON", () => {
  it("converts single user to GeoJSON feature", () => {
    const users: MockUser[] = [
      {
        id: 1,
        name: "Alice",
        avatarId: "avatar-123",
        location: {
          lng: -122.4194,
          lat: 37.7749,
          label: "San Francisco, CA",
          countryCode: "US",
        },
      },
    ];

    const result = usersToGeoJSON(users);

    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(1);
    expect(result.features[0]).toEqual({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749],
      },
      properties: {
        users: [
          {
            id: 1,
            name: "Alice",
            avatarId: "avatar-123",
            label: "San Francisco, CA",
            countryCode: "US",
          },
        ],
        count: 1,
        label: "San Francisco, CA",
      },
    });
  });

  it("groups users with identical coordinates", () => {
    const users: MockUser[] = [
      {
        id: 1,
        name: "Alice",
        avatarId: "avatar-1",
        location: {
          lng: -122.4194,
          lat: 37.7749,
          label: "San Francisco, CA",
          countryCode: "US",
        },
      },
      {
        id: 2,
        name: "Bob",
        avatarId: "avatar-2",
        location: {
          lng: -122.4194,
          lat: 37.7749,
          label: "San Francisco, CA",
          countryCode: "US",
        },
      },
    ];

    const result = usersToGeoJSON(users);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]!.properties.count).toBe(2);
    expect(result.features[0]!.properties.users).toHaveLength(2);
  });

  it("creates separate features for different coordinates", () => {
    const users: MockUser[] = [
      {
        id: 1,
        name: "Alice",
        avatarId: null,
        location: {
          lng: -122.4194,
          lat: 37.7749,
          label: "San Francisco, CA",
          countryCode: "US",
        },
      },
      {
        id: 2,
        name: "Bob",
        avatarId: null,
        location: {
          lng: -73.9857,
          lat: 40.7484,
          label: "New York, NY",
          countryCode: "US",
        },
      },
    ];

    const result = usersToGeoJSON(users);

    expect(result.features).toHaveLength(2);
    expect(result.features[0]!.properties.count).toBe(1);
    expect(result.features[1]!.properties.count).toBe(1);
  });

  it("handles empty user array", () => {
    const result = usersToGeoJSON([]);

    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(0);
  });

  it("handles null avatarId", () => {
    const users: MockUser[] = [
      {
        id: 1,
        name: "Alice",
        avatarId: null,
        location: {
          lng: 0,
          lat: 0,
          label: "Null Island",
          countryCode: "XX",
        },
      },
    ];

    const result = usersToGeoJSON(users);

    expect(result.features[0]!.properties.users[0]!.avatarId).toBeNull();
  });

  it("uses first user's label for grouped feature", () => {
    const users: MockUser[] = [
      {
        id: 1,
        name: "Alice",
        avatarId: null,
        location: {
          lng: -122.4194,
          lat: 37.7749,
          label: "SF Downtown",
          countryCode: "US",
        },
      },
      {
        id: 2,
        name: "Bob",
        avatarId: null,
        location: {
          lng: -122.4194,
          lat: 37.7749,
          label: "San Francisco", // Different label, same coords
          countryCode: "US",
        },
      },
    ];

    const result = usersToGeoJSON(users);

    // Feature label should come from first user
    expect(result.features[0]!.properties.label).toBe("SF Downtown");
    // But individual user labels are preserved
    expect(result.features[0]!.properties.users[0]!.label).toBe("SF Downtown");
    expect(result.features[0]!.properties.users[1]!.label).toBe("San Francisco");
  });

  it("handles precise floating point coordinates", () => {
    const users: MockUser[] = [
      {
        id: 1,
        name: "Alice",
        avatarId: null,
        location: {
          lng: -122.419_412_345_67,
          lat: 37.774_912_345_67,
          label: "Precise Location",
          countryCode: "US",
        },
      },
    ];

    const result = usersToGeoJSON(users);

    expect(result.features[0]!.geometry.coordinates).toEqual([
      -122.419_412_345_67,
      37.774_912_345_67,
    ]);
  });

  it("handles negative coordinates correctly", () => {
    const users: MockUser[] = [
      {
        id: 1,
        name: "Alice",
        avatarId: null,
        location: {
          lng: -180,
          lat: -90,
          label: "Southwest Corner",
          countryCode: "XX",
        },
      },
    ];

    const result = usersToGeoJSON(users);

    expect(result.features[0]!.geometry.coordinates).toEqual([-180, -90]);
  });

  it("handles multiple groups correctly", () => {
    const users: MockUser[] = [
      {
        id: 1,
        name: "Alice",
        avatarId: null,
        location: { lng: 0, lat: 0, label: "A", countryCode: "XX" },
      },
      {
        id: 2,
        name: "Bob",
        avatarId: null,
        location: { lng: 1, lat: 1, label: "B", countryCode: "XX" },
      },
      {
        id: 3,
        name: "Charlie",
        avatarId: null,
        location: { lng: 0, lat: 0, label: "A", countryCode: "XX" },
      },
      {
        id: 4,
        name: "David",
        avatarId: null,
        location: { lng: 1, lat: 1, label: "B", countryCode: "XX" },
      },
      {
        id: 5,
        name: "Eve",
        avatarId: null,
        location: { lng: 2, lat: 2, label: "C", countryCode: "XX" },
      },
    ];

    const result = usersToGeoJSON(users);

    expect(result.features).toHaveLength(3);

    // Find features by coordinates
    const feature0 = result.features.find(
      (f) => f.geometry.coordinates[0] === 0
    );
    const feature1 = result.features.find(
      (f) => f.geometry.coordinates[0] === 1
    );
    const feature2 = result.features.find(
      (f) => f.geometry.coordinates[0] === 2
    );

    expect(feature0!.properties.count).toBe(2);
    expect(feature1!.properties.count).toBe(2);
    expect(feature2!.properties.count).toBe(1);
  });
});
