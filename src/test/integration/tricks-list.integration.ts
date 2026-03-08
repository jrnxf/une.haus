import { beforeEach, describe, expect, it } from "bun:test"

import { truncatePublicTables } from "./helpers"
import { db } from "~/db"
import { tricks } from "~/db/schema"
import { listTricksImpl } from "~/lib/tricks/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("tricks list integration", () => {
  it("moves past the cursor instead of re-fetching the cursor row", async () => {
    const [alpha, beta, gamma] = await db
      .insert(tricks)
      .values([
        { name: "Alpha", slug: "alpha", spin: 180 },
        { name: "Beta", slug: "beta", spin: 360 },
        { name: "Gamma", slug: "gamma", spin: 540 },
      ])
      .returning()

    const firstPage = await listTricksImpl({
      data: {
        limit: 2,
      },
    })
    const secondPage = await listTricksImpl({
      data: {
        cursor: beta.id,
        limit: 2,
      },
    })

    expect(firstPage.map((trick) => trick.id)).toEqual([alpha.id, beta.id])
    expect(secondPage.map((trick) => trick.id)).toEqual([gamma.id])
  })
})
