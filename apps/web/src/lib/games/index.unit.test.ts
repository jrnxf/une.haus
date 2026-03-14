import { describe, expect, it, mock } from "bun:test"

mock.module("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
}))

mock.module("./bius", () => ({
  bius: {},
}))

mock.module("./sius", () => ({
  sius: {},
}))

mock.module("~/lib/games/rius/fns", () => ({
  adminOnlyRotateRiusServerFn: () => null,
  createRiuSetServerFn: () => null,
  createRiuSubmissionServerFn: () => null,
  deleteRiuSetServerFn: () => null,
  deleteRiuSubmissionServerFn: () => null,
  getArchivedRiusServerFn: () => null,
  getRiuSetServerFn: () => null,
  getRiuSubmissionServerFn: () => null,
  listActiveRiusServerFn: () => null,
  listArchivedRiusServerFn: () => null,
  listUpcomingRiuRosterServerFn: () => null,
  updateRiuSetServerFn: () => null,
}))

mock.module("~/lib/games/rius/schemas", () => ({
  createRiuSetSchema: {},
  createRiuSubmissionSchema: {},
  deleteRiuSetSchema: {},
  deleteRiuSubmissionSchema: {},
  getArchivedRiusSchema: {},
  getRiuSetSchema: {},
  getRiuSubmissionSchema: {},
  updateRiuSetSchema: {},
}))

const createUser = (id: number, name = `User ${id}`) => ({
  id,
  name,
  avatarId: null,
})

describe("groupSetsByUserWithRankings", () => {
  it("groups submission-only riders with normalized target set data", async () => {
    const { groupSetsByUserWithRankings } = await import(".")
    const rankedRiders = groupSetsByUserWithRankings([
      {
        id: 10,
        name: "Set Alpha",
        instructions: null,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        user: createUser(1, "Setter"),
        submissions: [
          {
            id: 101,
            createdAt: new Date("2024-01-01T12:00:00Z"),
            user: createUser(2, "Submitter"),
            likes: [{ id: 1 }],
            messages: [{ id: 1 }],
          },
        ],
      },
      {
        id: 11,
        name: "Set Beta",
        instructions: null,
        createdAt: new Date("2024-01-02T10:00:00Z"),
        user: createUser(3, "Setter 2"),
        submissions: [
          {
            id: 102,
            createdAt: new Date("2024-01-03T12:00:00Z"),
            user: createUser(2, "Submitter"),
            likes: [{ id: 2 }],
            messages: [{ id: 2 }],
          },
        ],
      },
    ])

    const submitter = rankedRiders.find((rider) => rider.user.id === 2)

    expect(submitter?.sets).toEqual([])
    expect(submitter?.submissions.map((submission) => submission.id)).toEqual([
      102, 101,
    ])
    expect(
      submitter?.submissions.map((submission) => submission.riuSet.name),
    ).toEqual(["Set Beta", "Set Alpha"])
    expect(submitter?.submissions[0]?.likes).toHaveLength(1)
    expect(submitter?.submissions[0]?.messages).toHaveLength(1)
  })

  it("keeps sets and submissions together for riders with both kinds of activity", async () => {
    const { groupSetsByUserWithRankings } = await import(".")
    const rankedRiders = groupSetsByUserWithRankings([
      {
        id: 10,
        name: "Set Alpha",
        instructions: null,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        user: createUser(1, "Rider One"),
        submissions: [
          {
            id: 101,
            createdAt: new Date("2024-01-01T12:00:00Z"),
            user: createUser(2, "Rider Two"),
            likes: [],
            messages: [{ id: 1 }],
          },
        ],
      },
      {
        id: 11,
        name: "Set Gamma",
        instructions: null,
        createdAt: new Date("2024-01-02T10:00:00Z"),
        user: createUser(2, "Rider Two"),
        submissions: [],
      },
    ])

    const riderTwo = rankedRiders.find((rider) => rider.user.id === 2)

    expect(riderTwo?.sets.map((set) => set.name)).toEqual(["Set Gamma"])
    expect(riderTwo?.submissions).toHaveLength(1)
    expect(riderTwo?.submissions[0]?.riuSet).toEqual({
      id: 10,
      name: "Set Alpha",
      instructions: null,
      user: createUser(1, "Rider One"),
    })
  })
})
