import { beforeEach, describe, expect, it } from "bun:test"

import { asUser, seedUser, truncatePublicTables, waitFor } from "./helpers"
import { db } from "~/db"
import { userFollows } from "~/db/schema"
import { followUserImpl, unfollowUserImpl } from "~/lib/users/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("users integration", () => {
  it("followUser creates the follow edge and sends a follow notification", async () => {
    const actor = await seedUser({ name: "Actor" })
    const target = await seedUser({ name: "Target" })

    await followUserImpl({
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

    await unfollowUserImpl({
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
