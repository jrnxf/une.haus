import { beforeEach, describe, expect, it } from "bun:test"

import rotateTask from "../../../server/tasks/rius/rotate"
import { db } from "~/db"
import { rius } from "~/db/schema"
import { truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedRiu(status: "active" | "archived" | "upcoming") {
  const [riu] = await db.insert(rius).values({ status }).returning()
  return riu
}

describe("rius rotate task", () => {
  it("happy path: archives active, activates upcoming, creates one new upcoming", async () => {
    const active = await seedRiu("active")
    const upcoming = await seedRiu("upcoming")

    const { result } = await rotateTask.run()

    expect(result.archived).toBe(1)
    expect(result.activated).toBe(1)
    expect(result.success).toBe(true)

    const rows = await db.query.rius.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rows.find((row) => row.id === active.id)?.status).toBe("archived")
    expect(rows.find((row) => row.id === upcoming.id)?.status).toBe("active")

    const upcomingRows = rows.filter((row) => row.status === "upcoming")
    expect(upcomingRows).toHaveLength(1)
    // the new upcoming is a brand new row, not the previous one
    expect(upcomingRows[0]?.id).toBe(result.newRiuId)
    expect(upcomingRows[0]?.id).not.toBe(upcoming.id)
  })

  it("cold start: empty table archives/activates nothing and creates one upcoming", async () => {
    const { result } = await rotateTask.run()

    expect(result.archived).toBe(0)
    expect(result.activated).toBe(0)
    expect(result.success).toBe(true)

    const rows = await db.query.rius.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe("upcoming")
    expect(rows[0]?.id).toBe(result.newRiuId)
  })

  it("two consecutive runs preserve the weekly cycle invariant", async () => {
    await seedRiu("active")
    const firstUpcoming = await seedRiu("upcoming")

    // run 1: firstUpcoming becomes active, a new upcoming is created
    await rotateTask.run()

    const afterFirst = await db.query.rius.findMany()
    expect(afterFirst.find((row) => row.id === firstUpcoming.id)?.status).toBe(
      "active",
    )
    const upcomingAfterFirst = afterFirst.filter(
      (row) => row.status === "upcoming",
    )
    expect(upcomingAfterFirst).toHaveLength(1)
    const secondUpcoming = upcomingAfterFirst[0]

    // run 2: firstUpcoming (now active) archives, secondUpcoming becomes active
    await rotateTask.run()

    const afterSecond = await db.query.rius.findMany()
    expect(afterSecond.find((row) => row.id === firstUpcoming.id)?.status).toBe(
      "archived",
    )
    expect(
      afterSecond.find((row) => row.id === secondUpcoming?.id)?.status,
    ).toBe("active")
    expect(afterSecond.filter((row) => row.status === "active")).toHaveLength(1)
    expect(afterSecond.filter((row) => row.status === "upcoming")).toHaveLength(
      1,
    )
  })
})
