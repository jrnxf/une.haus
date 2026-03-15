import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  biuSets,
  bius,
  muxVideos,
  postMessages,
  posts,
  riuSets,
  riuSubmissions,
  rius,
  siuSets,
  sius,
  trickSubmissions,
  trickSuggestions,
  trickVideos,
  tricks,
  userFollows,
  utvVideoSuggestions,
  utvVideos,
} from "~/db/schema"
import {
  followUser,
  getUserActivity,
  unfollowUser,
  updateUser,
} from "~/lib/users/ops.server"
import {
  asUser,
  seedUser,
  truncatePublicTables,
  waitFor,
} from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedMux(assetId: string) {
  const [video] = await db
    .insert(muxVideos)
    .values({
      assetId,
      playbackId: `playback-${assetId}`,
    })
    .returning()

  return video
}

async function seedTrick(overrides: Partial<typeof tricks.$inferInsert> = {}) {
  const [trick] = await db
    .insert(tricks)
    .values({
      name: overrides.name ?? "Base Trick",
      ...overrides,
    })
    .returning()

  return trick
}

describe("users integration", () => {
  describe("follow/unfollow", () => {
    it("followUser creates the follow edge and sends a follow notification", async () => {
      const actor = await seedUser({ name: "Actor" })
      const target = await seedUser({ name: "Target" })

      await followUser({
        ...asUser(actor),
        data: {
          userId: target.id,
        },
      })

      await waitFor(async () => {
        const rows = await db.query.notifications.findMany()
        expect(rows).toHaveLength(1)
      })

      expect(await db.query.userFollows.findMany()).toEqual([
        expect.objectContaining({
          followedByUserId: actor.id,
          followedUserId: target.id,
        }),
      ])
      expect(await db.query.notifications.findMany()).toEqual([
        expect.objectContaining({
          actorId: actor.id,
          entityId: actor.id,
          entityType: "user",
          type: "follow",
          userId: target.id,
        }),
      ])
    })

    it("unfollowUser removes only the matching follow edge", async () => {
      const actor = await seedUser({ name: "Actor" })
      const otherFollower = await seedUser({ name: "Other Follower" })
      const target = await seedUser({ name: "Target" })

      await db.insert(userFollows).values([
        {
          followedByUserId: actor.id,
          followedUserId: target.id,
        },
        {
          followedByUserId: otherFollower.id,
          followedUserId: target.id,
        },
      ])

      await unfollowUser({
        ...asUser(actor),
        data: {
          userId: target.id,
        },
      })

      expect(await db.query.userFollows.findMany()).toEqual([
        expect.objectContaining({
          followedByUserId: otherFollower.id,
          followedUserId: target.id,
        }),
      ])
    })
  })

  describe("profile persistence", () => {
    it("updateUser updates the base user row and covers location/social upsert and delete branches", async () => {
      const user = await seedUser({ name: "Original Name" })
      const sessionPayloads: unknown[] = []

      await updateUser({
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

      await updateUser({
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

      await updateUser({
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

  describe("activity", () => {
    it("merges mixed activity newest-first, paginates by cursor, and excludes deleted BIU/SIU sets", async () => {
      const user = await seedUser({ name: "Activity User" })
      const trick = await seedTrick({
        name: "Activity Trick",
      })
      const [biu] = await db.insert(bius).values({}).returning()
      const [riu] = await db
        .insert(rius)
        .values({ status: "active" })
        .returning()
      const [siu] = await db
        .insert(sius)
        .values({ status: "active" })
        .returning()
      const postVideo = await seedMux("post-video")
      const riuSetVideo = await seedMux("riu-set-video")
      const riuSubmissionVideo = await seedMux("riu-submission-video")
      const biuActiveVideo = await seedMux("biu-active-video")
      const biuDeletedVideo = await seedMux("biu-deleted-video")
      const siuActiveVideo = await seedMux("siu-active-video")
      const siuDeletedVideo = await seedMux("siu-deleted-video")
      const trickVideoAsset = await seedMux("trick-video")
      const utvMux = await seedMux("utv-video")

      const [post] = await db
        .insert(posts)
        .values({
          content: "post body",
          createdAt: new Date("2024-01-01T12:00:00Z"),
          muxAssetId: postVideo.assetId,
          title: "Activity Post",
          userId: user.id,
        })
        .returning()

      await db.insert(postMessages).values({
        content: "post comment",
        createdAt: new Date("2024-01-01T12:01:00Z"),
        postId: post.id,
        userId: user.id,
      })

      const [riuSet] = await db
        .insert(riuSets)
        .values({
          createdAt: new Date("2024-01-01T12:02:00Z"),
          instructions: "riu instructions",
          muxAssetId: riuSetVideo.assetId,
          name: "RIU Set",
          riuId: riu.id,
          userId: user.id,
        })
        .returning()

      await db.insert(riuSubmissions).values({
        createdAt: new Date("2024-01-01T12:03:00Z"),
        muxAssetId: riuSubmissionVideo.assetId,
        riuSetId: riuSet.id,
        userId: user.id,
      })

      await db.insert(biuSets).values([
        {
          biuId: biu.id,
          createdAt: new Date("2024-01-01T12:04:00Z"),
          deletedAt: new Date("2024-01-01T12:20:00Z"),
          muxAssetId: biuDeletedVideo.assetId,
          name: "Deleted BIU Set",
          parentSetId: null,
          position: 1,
          userId: user.id,
        },
        {
          biuId: biu.id,
          createdAt: new Date("2024-01-01T12:05:00Z"),
          muxAssetId: biuActiveVideo.assetId,
          name: "Active BIU Set",
          parentSetId: null,
          position: 2,
          userId: user.id,
        },
      ])

      await db.insert(siuSets).values([
        {
          createdAt: new Date("2024-01-01T12:06:00Z"),
          deletedAt: new Date("2024-01-01T12:21:00Z"),
          muxAssetId: siuDeletedVideo.assetId,
          name: "Deleted SIU Set",
          parentSetId: null,
          position: 1,
          siuId: siu.id,
          userId: user.id,
        },
        {
          createdAt: new Date("2024-01-01T12:07:00Z"),
          muxAssetId: siuActiveVideo.assetId,
          name: "Active SIU Set",
          parentSetId: null,
          position: 2,
          siuId: siu.id,
          userId: user.id,
        },
      ])

      await db.insert(trickSubmissions).values({
        createdAt: new Date("2024-01-01T12:08:00Z"),
        name: "Trick Submission",
        submittedByUserId: user.id,
      })

      await db.insert(trickSuggestions).values({
        createdAt: new Date("2024-01-01T12:09:00Z"),
        diff: { notes: "suggestion" },
        submittedByUserId: user.id,
        trickId: trick.id,
      })

      await db.insert(trickVideos).values({
        createdAt: new Date("2024-01-01T12:10:00Z"),
        muxAssetId: trickVideoAsset.assetId,
        status: "pending",
        submittedByUserId: user.id,
        trickId: trick.id,
      })

      const [utvVideo] = await db
        .insert(utvVideos)
        .values({
          legacyTitle: "Legacy Video",
          legacyUrl: "https://example.com/legacy.mp4",
          muxAssetId: utvMux.assetId,
          title: "UTV Video",
        })
        .returning()

      await db.insert(utvVideoSuggestions).values({
        createdAt: new Date("2024-01-01T12:11:00Z"),
        diff: { title: "Updated UTV Title" },
        submittedByUserId: user.id,
        utvVideoId: utvVideo.id,
      })

      const firstPage = await getUserActivity({
        data: {
          limit: 5,
          userId: user.id,
        },
      })

      expect(firstPage.items.map((item) => item.type)).toEqual([
        "utvVideoSuggestion",
        "trickVideo",
        "trickSuggestion",
        "trickSubmission",
        "siuSet",
      ])
      expect(firstPage.nextCursor).toBeDefined()

      const secondPage = await getUserActivity({
        data: {
          cursor: firstPage.nextCursor,
          limit: 5,
          userId: user.id,
        },
      })

      expect(secondPage.items.map((item) => item.type)).toEqual([
        "biuSet",
        "riuSubmission",
        "riuSet",
        "comment",
        "post",
      ])
      expect(
        [...firstPage.items, ...secondPage.items].map((item) => item.type),
      ).toEqual([
        "utvVideoSuggestion",
        "trickVideo",
        "trickSuggestion",
        "trickSubmission",
        "siuSet",
        "biuSet",
        "riuSubmission",
        "riuSet",
        "comment",
        "post",
      ])
    })

    it("supports type filtering and returns joined parent metadata for comments", async () => {
      const user = await seedUser({ name: "Activity User" })

      const [post] = await db
        .insert(posts)
        .values({
          content: "post body",
          createdAt: new Date("2024-01-02T12:00:00Z"),
          title: "Joined Parent Post",
          userId: user.id,
        })
        .returning()

      await db.insert(postMessages).values({
        content: "comment body",
        createdAt: new Date("2024-01-02T12:01:00Z"),
        postId: post.id,
        userId: user.id,
      })

      const activity = await getUserActivity({
        data: {
          limit: 10,
          type: "comment",
          userId: user.id,
        },
      })

      expect(activity.items).toEqual([
        expect.objectContaining({
          content: "comment body",
          parentId: post.id,
          parentTitle: "Joined Parent Post",
          parentType: "post",
          type: "comment",
        }),
      ])
      expect(activity.nextCursor).toBeUndefined()
    })
  })
})
