import { beforeEach, describe, expect, it } from "bun:test"

import { getHighScore, saveHighScore } from "~/lib/arcade/ops.server"
import { asUser, seedUser, truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("arcade high score integration", () => {
  it("getHighScore returns 0 for a new user", async () => {
    const user = await seedUser({ name: "Player" })
    expect(await getHighScore(user.id)).toBe(0)
  })

  it("saveHighScore persists the first score", async () => {
    const user = await seedUser({ name: "Player" })

    await saveHighScore({ ...asUser(user), data: { score: 100 } })

    expect(await getHighScore(user.id)).toBe(100)
  })

  it("saveHighScore is monotonic: lower scores are ignored, higher scores win", async () => {
    const user = await seedUser({ name: "Player" })

    await saveHighScore({ ...asUser(user), data: { score: 100 } })
    // A lower score must not lower the high score.
    await saveHighScore({ ...asUser(user), data: { score: 50 } })
    expect(await getHighScore(user.id)).toBe(100)

    // A higher score replaces it.
    await saveHighScore({ ...asUser(user), data: { score: 150 } })
    expect(await getHighScore(user.id)).toBe(150)
  })

  it("saveHighScore is scoped to the acting user", async () => {
    const userA = await seedUser({ name: "Player A" })
    const userB = await seedUser({ name: "Player B" })

    await saveHighScore({ ...asUser(userA), data: { score: 100 } })
    await saveHighScore({ ...asUser(userB), data: { score: 999 } })

    expect(await getHighScore(userA.id)).toBe(100)
    expect(await getHighScore(userB.id)).toBe(999)
  })
})
