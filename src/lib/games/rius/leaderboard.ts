import { calculateRiderRankings, type RiderScore } from "./ranking"

type User = {
  id: number
  name: string
  avatarId: string | null
  bio?: string | null
  disciplines?: string[] | null
}

type SetWithSubmissions = {
  id: number
  name: string
  instructions: string | null
  createdAt: Date
  user: User
  submissions?: {
    id: number
    createdAt: Date
    user: Pick<User, "id" | "name" | "avatarId">
    likes?: unknown[]
    messages?: unknown[]
  }[]
}

type GroupedRiuSubmission<
  TSubmission extends NonNullable<SetWithSubmissions["submissions"]>[number] =
    NonNullable<SetWithSubmissions["submissions"]>[number],
> = TSubmission & {
  riuSet: {
    id: number
    name: string
    instructions: string | null
    user: Pick<User, "id" | "name" | "avatarId">
  }
}

export type RankedRider<T extends SetWithSubmissions = SetWithSubmissions> = {
  user: User
  sets: T[]
  submissions: GroupedRiuSubmission<NonNullable<T["submissions"]>[number]>[]
  ranking: RiderScore
}

/**
 * Groups sets by user and calculates rankings.
 * Returns an array sorted by rank (1st place first).
 */
export function groupSetsByUserWithRankings<T extends SetWithSubmissions>(
  sets: T[],
): RankedRider<T>[] {
  // Calculate rankings using the ranking module
  const rankings = calculateRiderRankings(sets)

  // Group sets by user
  const groups = new Map<
    number,
    {
      user: User
      sets: T[]
      submissions: GroupedRiuSubmission<NonNullable<T["submissions"]>[number]>[]
    }
  >()
  for (const set of sets) {
    const userId = set.user.id
    const existing = groups.get(userId)
    if (existing) {
      existing.sets.push(set)
    } else {
      groups.set(userId, {
        user: set.user,
        sets: [set],
        submissions: [],
      })
    }

    for (const submission of set.submissions ?? []) {
      const submissionUserId = submission.user.id
      const groupedSubmission = {
        ...submission,
        riuSet: {
          id: set.id,
          name: set.name,
          instructions: set.instructions,
          user: set.user,
        },
      } satisfies GroupedRiuSubmission<NonNullable<T["submissions"]>[number]>

      const submissionGroup = groups.get(submissionUserId)
      if (submissionGroup) {
        submissionGroup.submissions.push(groupedSubmission)
      } else {
        groups.set(submissionUserId, {
          user: submission.user,
          sets: [],
          submissions: [groupedSubmission],
        })
      }
    }
  }

  for (const group of groups.values()) {
    group.submissions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }

  // Combine groups with rankings and sort by rank
  const result: RankedRider<T>[] = []

  for (const ranking of rankings) {
    const group = groups.get(ranking.user.id)
    if (group) {
      result.push({
        user: group.user,
        sets: group.sets,
        submissions: group.submissions,
        ranking,
      })
    } else {
      result.push({
        user: ranking.user,
        sets: [],
        submissions: [],
        ranking,
      })
    }
  }

  return result
}
