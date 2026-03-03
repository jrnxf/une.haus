import {
  calculatePoints,
  calculateRiderRankings,
  compareRiders,
  POINTS_PER_SET,
  POINTS_PER_SUBMISSION,
  type RiderScore,
  type RiuSet,
  type RiuSubmission,
} from "./ranking"

// Helper to create test users
const createUser = (id: number, name = `User ${id}`) => ({
  id,
  name,
  avatarId: null,
})

// Helper to create a set
const createSet = (
  id: number,
  userId: number,
  createdAt: Date,
  submissions: RiuSubmission[] = [],
): RiuSet & { submissions: RiuSubmission[] } => ({
  id,
  createdAt,
  user: createUser(userId),
  submissions,
})

// Helper to create a submission
const createSubmission = (
  id: number,
  userId: number,
  createdAt: Date,
): RiuSubmission => ({
  id,
  createdAt,
  user: createUser(userId),
})

// Helper to create a rider score
const createRiderScore = (
  overrides: Partial<RiderScore> & { userId: number },
): RiderScore => ({
  user: createUser(overrides.userId),
  setsCount: overrides.setsCount ?? 0,
  submissionsCount: overrides.submissionsCount ?? 0,
  points: overrides.points ?? 0,
  lastSetAt: overrides.lastSetAt ?? null,
  lastSubmissionAt: overrides.lastSubmissionAt ?? null,
  rank: overrides.rank ?? 0,
})

describe("calculatePoints", () => {
  it("returns 0 for no sets and no submissions", () => {
    expect(calculatePoints(0, 0)).toBe(0)
  })

  it("calculates points for sets only (1 point per set)", () => {
    expect(calculatePoints(1, 0)).toBe(1 * POINTS_PER_SET)
    expect(calculatePoints(5, 0)).toBe(5 * POINTS_PER_SET)
  })

  it("calculates points for submissions only (1 point per submission)", () => {
    expect(calculatePoints(0, 1)).toBe(1 * POINTS_PER_SUBMISSION)
    expect(calculatePoints(0, 5)).toBe(5 * POINTS_PER_SUBMISSION)
  })

  it("calculates combined points for sets and submissions", () => {
    // 2 sets (2 points) + 3 submissions (9 points) = 11 points
    expect(calculatePoints(2, 3)).toBe(
      2 * POINTS_PER_SET + 3 * POINTS_PER_SUBMISSION,
    )
  })

  it("validates point constants", () => {
    expect(POINTS_PER_SET).toBe(1)
    expect(POINTS_PER_SUBMISSION).toBe(1)
  })
})

describe("compareRiders", () => {
  describe("point-based ranking", () => {
    it("ranks higher points first", () => {
      const a = createRiderScore({ userId: 1, points: 10 })
      const b = createRiderScore({ userId: 2, points: 5 })

      expect(compareRiders(a, b)).toBeLessThan(0)
      expect(compareRiders(b, a)).toBeGreaterThan(0)
    })

    it("returns 0 for equal points with no tiebreaker data", () => {
      const a = createRiderScore({ userId: 1, points: 10 })
      const b = createRiderScore({ userId: 2, points: 10 })

      expect(compareRiders(a, b)).toBe(0)
    })
  })

  describe("tiebreaker: sets only (no submissions)", () => {
    it("ranks whoever uploaded their last set FIRST as the winner", () => {
      const earlier = new Date("2024-01-01T10:00:00Z")
      const later = new Date("2024-01-01T12:00:00Z")

      const a = createRiderScore({
        userId: 1,
        points: 2,
        setsCount: 2,
        submissionsCount: 0,
        lastSetAt: earlier,
      })
      const b = createRiderScore({
        userId: 2,
        points: 2,
        setsCount: 2,
        submissionsCount: 0,
        lastSetAt: later,
      })

      // a uploaded last set earlier, so a wins
      expect(compareRiders(a, b)).toBeLessThan(0)
      expect(compareRiders(b, a)).toBeGreaterThan(0)
    })

    it("handles same timestamp as tie", () => {
      const sameTime = new Date("2024-01-01T10:00:00Z")

      const a = createRiderScore({
        userId: 1,
        points: 2,
        setsCount: 2,
        submissionsCount: 0,
        lastSetAt: sameTime,
      })
      const b = createRiderScore({
        userId: 2,
        points: 2,
        setsCount: 2,
        submissionsCount: 0,
        lastSetAt: sameTime,
      })

      expect(compareRiders(a, b)).toBe(0)
    })

    it("ranks rider with sets over rider with no sets when tied", () => {
      const a = createRiderScore({
        userId: 1,
        points: 0,
        setsCount: 0,
        submissionsCount: 0,
        lastSetAt: null,
      })
      const b = createRiderScore({
        userId: 2,
        points: 0,
        setsCount: 0,
        submissionsCount: 0,
        lastSetAt: new Date("2024-01-01T10:00:00Z"),
      })

      // b has a set, a doesn't - b should win
      expect(compareRiders(a, b)).toBeGreaterThan(0)
      expect(compareRiders(b, a)).toBeLessThan(0)
    })
  })

  describe("tiebreaker: with submissions", () => {
    it("ranks whoever uploaded their last submission FIRST as the winner", () => {
      const earlier = new Date("2024-01-01T10:00:00Z")
      const later = new Date("2024-01-01T12:00:00Z")

      const a = createRiderScore({
        userId: 1,
        points: 3, // 1 set + 2 submissions
        setsCount: 1,
        submissionsCount: 2,
        lastSetAt: new Date("2024-01-01T08:00:00Z"),
        lastSubmissionAt: earlier,
      })
      const b = createRiderScore({
        userId: 2,
        points: 3, // 1 set + 2 submissions
        setsCount: 1,
        submissionsCount: 2,
        lastSetAt: new Date("2024-01-01T08:00:00Z"),
        lastSubmissionAt: later,
      })

      // a uploaded last submission earlier, so a wins
      expect(compareRiders(a, b)).toBeLessThan(0)
      expect(compareRiders(b, a)).toBeGreaterThan(0)
    })

    it("uses submission tiebreaker even when one rider has no sets", () => {
      const earlier = new Date("2024-01-01T10:00:00Z")
      const later = new Date("2024-01-01T12:00:00Z")

      // Both have 1 point from 1 submission
      const a = createRiderScore({
        userId: 1,
        points: 1,
        setsCount: 0,
        submissionsCount: 1,
        lastSetAt: null,
        lastSubmissionAt: earlier,
      })
      const b = createRiderScore({
        userId: 2,
        points: 1,
        setsCount: 0,
        submissionsCount: 1,
        lastSetAt: null,
        lastSubmissionAt: later,
      })

      // a submitted earlier, so a wins
      expect(compareRiders(a, b)).toBeLessThan(0)
    })

    it("uses submission tiebreaker when only one rider has submissions", () => {
      // a: 2 points from 2 sets, no submissions
      // b: 2 points from 1 set + 1 submission
      const a = createRiderScore({
        userId: 1,
        points: 2,
        setsCount: 2,
        submissionsCount: 0,
        lastSetAt: new Date("2024-01-01T10:00:00Z"),
        lastSubmissionAt: null,
      })
      const b = createRiderScore({
        userId: 2,
        points: 2,
        setsCount: 1,
        submissionsCount: 1,
        lastSetAt: new Date("2024-01-01T08:00:00Z"),
        lastSubmissionAt: new Date("2024-01-01T12:00:00Z"),
      })

      // b has a submission, so we use submission tiebreaker
      // b has a lastSubmissionAt, a doesn't - b wins
      expect(compareRiders(a, b)).toBeGreaterThan(0)
      expect(compareRiders(b, a)).toBeLessThan(0)
    })
  })
})

describe("calculateRiderRankings", () => {
  it("returns empty array for no sets", () => {
    const rankings = calculateRiderRankings([])
    expect(rankings).toEqual([])
  })

  it("calculates ranking for single user with one set", () => {
    const sets = [createSet(1, 100, new Date("2024-01-01"))]
    const rankings = calculateRiderRankings(sets)

    expect(rankings).toHaveLength(1)
    expect(rankings[0].user.id).toBe(100)
    expect(rankings[0].setsCount).toBe(1)
    expect(rankings[0].submissionsCount).toBe(0)
    expect(rankings[0].points).toBe(1)
    expect(rankings[0].rank).toBe(1)
  })

  it("aggregates multiple sets from same user", () => {
    const sets = [
      createSet(1, 100, new Date("2024-01-01")),
      createSet(2, 100, new Date("2024-01-02")),
      createSet(3, 100, new Date("2024-01-03")),
    ]
    const rankings = calculateRiderRankings(sets)

    expect(rankings).toHaveLength(1)
    expect(rankings[0].setsCount).toBe(3)
    expect(rankings[0].points).toBe(3)
    expect(rankings[0].lastSetAt).toEqual(new Date("2024-01-03"))
  })

  it("tracks submissions from users", () => {
    const sets = [
      createSet(1, 100, new Date("2024-01-01"), [
        createSubmission(1, 200, new Date("2024-01-02")),
        createSubmission(2, 200, new Date("2024-01-03")),
      ]),
    ]
    const rankings = calculateRiderRankings(sets)

    expect(rankings).toHaveLength(2)

    const setOwner = rankings.find((r) => r.user.id === 100)
    const submitter = rankings.find((r) => r.user.id === 200)

    expect(setOwner?.setsCount).toBe(1)
    expect(setOwner?.submissionsCount).toBe(0)
    expect(setOwner?.points).toBe(1)

    expect(submitter?.setsCount).toBe(0)
    expect(submitter?.submissionsCount).toBe(2)
    expect(submitter?.points).toBe(2)
    expect(submitter?.lastSubmissionAt).toEqual(new Date("2024-01-03"))
  })

  it("ranks users by points (higher first)", () => {
    // User 100: 1 set = 1 point
    // User 200: 2 submissions = 2 points
    const sets = [
      createSet(1, 100, new Date("2024-01-01"), [
        createSubmission(1, 200, new Date("2024-01-02")),
        createSubmission(2, 200, new Date("2024-01-03")),
      ]),
    ]
    const rankings = calculateRiderRankings(sets)

    expect(rankings[0].user.id).toBe(200) // 2 points, rank 1
    expect(rankings[0].rank).toBe(1)
    expect(rankings[1].user.id).toBe(100) // 1 point, rank 2
    expect(rankings[1].rank).toBe(2)
  })

  describe("tiebreaker scenarios", () => {
    it("breaks tie with sets-only by earlier last set", () => {
      // User 100: 2 sets, last set at 10:00
      // User 200: 2 sets, last set at 12:00
      const sets = [
        createSet(1, 100, new Date("2024-01-01T08:00:00Z")),
        createSet(2, 100, new Date("2024-01-01T10:00:00Z")),
        createSet(3, 200, new Date("2024-01-01T09:00:00Z")),
        createSet(4, 200, new Date("2024-01-01T12:00:00Z")),
      ]
      const rankings = calculateRiderRankings(sets)

      expect(rankings[0].user.id).toBe(100) // Earlier last set wins
      expect(rankings[0].rank).toBe(1)
      expect(rankings[1].user.id).toBe(200)
      expect(rankings[1].rank).toBe(2)
    })

    it("breaks tie with submissions by earlier last submission", () => {
      // User 100: 1 set + 1 submission = 2 points, last submission at 10:00
      // User 200: 1 set + 1 submission = 2 points, last submission at 12:00
      const sets = [
        createSet(1, 100, new Date("2024-01-01T08:00:00Z"), [
          createSubmission(1, 200, new Date("2024-01-01T12:00:00Z")),
        ]),
        createSet(2, 200, new Date("2024-01-01T09:00:00Z"), [
          createSubmission(2, 100, new Date("2024-01-01T10:00:00Z")),
        ]),
      ]
      const rankings = calculateRiderRankings(sets)

      expect(rankings[0].user.id).toBe(100) // Earlier last submission wins
      expect(rankings[0].rank).toBe(1)
      expect(rankings[1].user.id).toBe(200)
      expect(rankings[1].rank).toBe(2)
    })

    it("user with submission beats user with only sets when tied on points", () => {
      // User 100: 2 sets = 2 points, last set at 10:00
      // User 200: 1 set + 1 submission = 2 points, last submission at 12:00
      const sets = [
        createSet(1, 100, new Date("2024-01-01T08:00:00Z")),
        createSet(2, 100, new Date("2024-01-01T10:00:00Z")),
        createSet(3, 200, new Date("2024-01-01T07:00:00Z"), [
          createSubmission(1, 200, new Date("2024-01-01T12:00:00Z")),
        ]),
      ]
      const rankings = calculateRiderRankings(sets)

      // User 200 has a submission, so submission tiebreaker applies
      // User 200 has lastSubmissionAt, User 100 doesn't, so User 200 wins
      expect(rankings[0].user.id).toBe(200)
      expect(rankings[0].rank).toBe(1)
      expect(rankings[1].user.id).toBe(100)
      expect(rankings[1].rank).toBe(2)
    })
  })

  describe("complex scenarios", () => {
    it("handles multiple users with mixed sets and submissions", () => {
      // User 100: 2 sets = 2 points
      // User 200: 1 set + 2 submissions = 3 points
      // User 300: 3 submissions = 3 points
      const sets = [
        createSet(1, 100, new Date("2024-01-01"), [
          createSubmission(1, 200, new Date("2024-01-02")),
          createSubmission(2, 300, new Date("2024-01-03")),
        ]),
        createSet(2, 100, new Date("2024-01-04"), [
          createSubmission(3, 200, new Date("2024-01-05")),
          createSubmission(4, 300, new Date("2024-01-06")),
        ]),
        createSet(3, 200, new Date("2024-01-07"), [
          createSubmission(5, 300, new Date("2024-01-08")),
        ]),
      ]
      const rankings = calculateRiderRankings(sets)

      expect(rankings).toHaveLength(3)

      // User 200 and 300 both have 3 points, tiebreak by last submission
      // User 200: last submission at Jan 5, User 300: last submission at Jan 8
      // User 200 wins tiebreak (earlier last submission)
      expect(rankings[0].user.id).toBe(200) // 3 points, earlier submission
      expect(rankings[0].points).toBe(3)
      expect(rankings[0].rank).toBe(1)

      expect(rankings[1].user.id).toBe(300) // 3 points, later submission
      expect(rankings[1].points).toBe(3)
      expect(rankings[1].rank).toBe(2)

      expect(rankings[2].user.id).toBe(100) // 2 points
      expect(rankings[2].points).toBe(2)
      expect(rankings[2].rank).toBe(3)
    })

    it("correctly identifies last set and submission times", () => {
      const sets = [
        createSet(1, 100, new Date("2024-01-01T10:00:00Z"), [
          createSubmission(1, 100, new Date("2024-01-02T08:00:00Z")),
        ]),
        createSet(2, 100, new Date("2024-01-03T10:00:00Z"), [
          createSubmission(2, 100, new Date("2024-01-04T12:00:00Z")),
        ]),
      ]
      const rankings = calculateRiderRankings(sets)

      expect(rankings[0].lastSetAt).toEqual(new Date("2024-01-03T10:00:00Z"))
      expect(rankings[0].lastSubmissionAt).toEqual(
        new Date("2024-01-04T12:00:00Z"),
      )
    })

    it("handles user who only submits (no sets)", () => {
      const sets = [
        createSet(1, 100, new Date("2024-01-01"), [
          createSubmission(1, 200, new Date("2024-01-02")),
        ]),
      ]
      const rankings = calculateRiderRankings(sets)

      const submitter = rankings.find((r) => r.user.id === 200)
      expect(submitter?.setsCount).toBe(0)
      expect(submitter?.submissionsCount).toBe(1)
      expect(submitter?.points).toBe(1)
      expect(submitter?.lastSetAt).toBeNull()
      expect(submitter?.lastSubmissionAt).toEqual(new Date("2024-01-02"))
    })

    it("handles three-way tie with only sets", () => {
      // All three users have 2 sets = 2 points each
      // User 100: last set at 10:00 (earliest - wins)
      // User 200: last set at 11:00 (second)
      // User 300: last set at 12:00 (third)
      const sets = [
        createSet(1, 100, new Date("2024-01-01T09:00:00Z")),
        createSet(2, 100, new Date("2024-01-01T10:00:00Z")),
        createSet(3, 200, new Date("2024-01-01T10:30:00Z")),
        createSet(4, 200, new Date("2024-01-01T11:00:00Z")),
        createSet(5, 300, new Date("2024-01-01T11:30:00Z")),
        createSet(6, 300, new Date("2024-01-01T12:00:00Z")),
      ]
      const rankings = calculateRiderRankings(sets)

      expect(rankings[0].user.id).toBe(100)
      expect(rankings[0].rank).toBe(1)
      expect(rankings[1].user.id).toBe(200)
      expect(rankings[1].rank).toBe(2)
      expect(rankings[2].user.id).toBe(300)
      expect(rankings[2].rank).toBe(3)
    })

    it("handles three-way tie with submissions", () => {
      // All three users have 1 set + 1 submission = 2 points each
      // User 100: last submission at 10:00 (earliest - wins)
      // User 200: last submission at 11:00 (second)
      // User 300: last submission at 12:00 (third)
      const sets = [
        createSet(1, 100, new Date("2024-01-01T08:00:00Z"), [
          createSubmission(1, 200, new Date("2024-01-01T11:00:00Z")),
        ]),
        createSet(2, 200, new Date("2024-01-01T08:00:00Z"), [
          createSubmission(2, 300, new Date("2024-01-01T12:00:00Z")),
        ]),
        createSet(3, 300, new Date("2024-01-01T08:00:00Z"), [
          createSubmission(3, 100, new Date("2024-01-01T10:00:00Z")),
        ]),
      ]
      const rankings = calculateRiderRankings(sets)

      expect(rankings[0].user.id).toBe(100)
      expect(rankings[0].rank).toBe(1)
      expect(rankings[1].user.id).toBe(200)
      expect(rankings[1].rank).toBe(2)
      expect(rankings[2].user.id).toBe(300)
      expect(rankings[2].rank).toBe(3)
    })
  })

  describe("edge cases", () => {
    it("handles sets without submissions array", () => {
      const sets = [{ id: 1, createdAt: new Date(), user: createUser(100) }]
      const rankings = calculateRiderRankings(sets)

      expect(rankings).toHaveLength(1)
      expect(rankings[0].setsCount).toBe(1)
      expect(rankings[0].submissionsCount).toBe(0)
    })

    it("handles empty submissions array", () => {
      const sets = [createSet(1, 100, new Date(), [])]
      const rankings = calculateRiderRankings(sets)

      expect(rankings).toHaveLength(1)
      expect(rankings[0].submissionsCount).toBe(0)
    })

    it("user appears in multiple sets' submissions", () => {
      // User 200 submits to multiple sets
      const sets = [
        createSet(1, 100, new Date("2024-01-01"), [
          createSubmission(1, 200, new Date("2024-01-02")),
        ]),
        createSet(2, 100, new Date("2024-01-03"), [
          createSubmission(2, 200, new Date("2024-01-04")),
        ]),
        createSet(3, 100, new Date("2024-01-05"), [
          createSubmission(3, 200, new Date("2024-01-06")),
        ]),
      ]
      const rankings = calculateRiderRankings(sets)

      const submitter = rankings.find((r) => r.user.id === 200)
      expect(submitter?.submissionsCount).toBe(3)
      expect(submitter?.points).toBe(3)
    })
  })
})
