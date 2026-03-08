import { beforeEach, describe, expect, it } from "bun:test"

import { asUser, seedUser, truncatePublicTables } from "./helpers"
import { db } from "~/db"
import { updateUserImpl } from "~/lib/users/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("user profile persistence integration", () => {
  it("updateUser updates the base user row and covers location/social upsert and delete branches", async () => {
    const user = await seedUser({ name: "Original Name" })
    const sessionPayloads: unknown[] = []

    await updateUserImpl({
      ...asUser(user),
      data: {
        avatarId: "avatar-1",
        bio: "bio one",
        disciplines: ["flatland"],
        email: "updated@example.com",
        location: {
          countryCode: "US",
          countryName: "United States",
          label: "New York, NY",
          lat: 40.7128,
          lng: -74.006,
        },
        name: "Updated Name",
        socials: {
          facebook: "",
          instagram: "https://instagram.com/example",
          spotify: null,
          tiktok: null,
          twitter: "https://twitter.com/example",
          youtube: null,
        },
      },
      updateSession: async (payload) => {
        sessionPayloads.push(payload)
      },
    })

    await updateUserImpl({
      ...asUser(user),
      data: {
        avatarId: "avatar-2",
        bio: "bio two",
        disciplines: ["street"],
        email: "updated-again@example.com",
        location: {
          countryCode: "PT",
          countryName: "Portugal",
          label: "Lisbon",
          lat: 38.7223,
          lng: -9.1393,
        },
        name: "Updated Again",
        socials: {
          facebook: null,
          instagram: "https://instagram.com/example-two",
          spotify: "https://open.spotify.com/artist/example",
          tiktok: null,
          twitter: "",
          youtube: "https://youtube.com/@example",
        },
      },
      updateSession: async (payload) => {
        sessionPayloads.push(payload)
      },
    })

    const rereadUser = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, user.id),
    })
    const location = await db.query.userLocations.findFirst({
      where: (table, { eq }) => eq(table.userId, user.id),
    })
    const socials = await db.query.userSocials.findFirst({
      where: (table, { eq }) => eq(table.userId, user.id),
    })

    expect(rereadUser).toEqual(
      expect.objectContaining({
        avatarId: "avatar-2",
        bio: "bio two",
        disciplines: ["street"],
        email: "updated-again@example.com",
        id: user.id,
        name: "Updated Again",
      }),
    )
    expect(location).toEqual(
      expect.objectContaining({
        countryCode: "PT",
        countryName: "Portugal",
        label: "Lisbon",
      }),
    )
    expect(socials).toEqual(
      expect.objectContaining({
        instagram: "https://instagram.com/example-two",
        spotify: "https://open.spotify.com/artist/example",
        twitter: "",
        youtube: "https://youtube.com/@example",
      }),
    )
    expect(sessionPayloads).toHaveLength(2)

    await updateUserImpl({
      ...asUser(user),
      data: {
        avatarId: null,
        bio: null,
        disciplines: [],
        email: "final@example.com",
        location: null,
        name: "Final Name",
        socials: null,
      },
      updateSession: async (payload) => {
        sessionPayloads.push(payload)
      },
    })

    expect(
      await db.query.userLocations.findFirst({
        where: (table, { eq }) => eq(table.userId, user.id),
      }),
    ).toBeUndefined()
    expect(
      await db.query.userSocials.findFirst({
        where: (table, { eq }) => eq(table.userId, user.id),
      }),
    ).toBeUndefined()
    expect(
      await db.query.users.findFirst({
        where: (table, { eq }) => eq(table.id, user.id),
      }),
    ).toEqual(
      expect.objectContaining({
        avatarId: null,
        bio: null,
        email: "final@example.com",
        name: "Final Name",
      }),
    )
  })
})
