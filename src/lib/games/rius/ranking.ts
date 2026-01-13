/**
 * RIU Game Ranking System
 *
 * Scoring:
 * - Each set uploaded = 1 point
 * - Each submission uploaded = 3 points
 *
 * Tiebreakers:
 * - If tied users only uploaded sets (no submissions), whoever uploaded their last set first wins
 * - If tied users have same sets AND submissions, whoever uploaded their last submission first wins
 */

export type RiuSet = {
  id: number;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    avatarId: string | null;
  };
};

export type RiuSubmission = {
  id: number;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    avatarId: string | null;
  };
};

export type RiderScore = {
  user: {
    id: number;
    name: string;
    avatarId: string | null;
  };
  setsCount: number;
  submissionsCount: number;
  points: number;
  lastSetAt: Date | null;
  lastSubmissionAt: Date | null;
  rank: number;
};

export const POINTS_PER_SET = 1;
export const POINTS_PER_SUBMISSION = 3;

/**
 * Calculate the total points for a rider based on their sets and submissions
 */
export function calculatePoints(
  setsCount: number,
  submissionsCount: number
): number {
  return setsCount * POINTS_PER_SET + submissionsCount * POINTS_PER_SUBMISSION;
}

/**
 * Compare two riders for sorting purposes.
 * Returns negative if a should come before b, positive if b should come before a.
 *
 * Comparison rules:
 * 1. Higher points wins
 * 2. If tied points and both have only sets (no submissions):
 *    - Whoever uploaded their last set FIRST wins
 * 3. If tied points and at least one has submissions:
 *    - Whoever uploaded their last submission FIRST wins
 */
export function compareRiders(a: RiderScore, b: RiderScore): number {
  // First compare by points (higher is better)
  if (a.points !== b.points) {
    return b.points - a.points;
  }

  // Tied points - apply tiebreakers
  const aHasSubmissions = a.submissionsCount > 0;
  const bHasSubmissions = b.submissionsCount > 0;

  // If neither has submissions, compare by last set time (earlier wins)
  if (!aHasSubmissions && !bHasSubmissions) {
    if (a.lastSetAt && b.lastSetAt) {
      return a.lastSetAt.getTime() - b.lastSetAt.getTime();
    }
    // If one has no sets, they lose
    if (a.lastSetAt && !b.lastSetAt) return -1;
    if (!a.lastSetAt && b.lastSetAt) return 1;
    return 0;
  }

  // At least one has submissions - compare by last submission time (earlier wins)
  if (a.lastSubmissionAt && b.lastSubmissionAt) {
    return a.lastSubmissionAt.getTime() - b.lastSubmissionAt.getTime();
  }
  // If one has no submission timestamp but has submissions, that's unexpected
  // Fall back to whoever has a submission wins
  if (a.lastSubmissionAt && !b.lastSubmissionAt) return -1;
  if (!a.lastSubmissionAt && b.lastSubmissionAt) return 1;
  return 0;
}

/**
 * Calculate rankings for all riders in a RIU game.
 * Takes all sets with their submissions and returns ranked riders.
 */
export function calculateRiderRankings(
  sets: (RiuSet & {
      submissions?: RiuSubmission[];
    })[]
): RiderScore[] {
  // Aggregate data by user
  const userMap = new Map<
    number,
    {
      user: RiuSet["user"];
      sets: RiuSet[];
      submissions: RiuSubmission[];
    }
  >();

  for (const set of sets) {
    const userId = set.user.id;
    let userData = userMap.get(userId);

    if (!userData) {
      userData = {
        user: set.user,
        sets: [],
        submissions: [],
      };
      userMap.set(userId, userData);
    }

    userData.sets.push(set);

    // Also collect submissions from other users
    if (set.submissions) {
      for (const submission of set.submissions) {
        const submissionUserId = submission.user.id;
        let submitterData = userMap.get(submissionUserId);

        if (!submitterData) {
          submitterData = {
            user: submission.user,
            sets: [],
            submissions: [],
          };
          userMap.set(submissionUserId, submitterData);
        }

        submitterData.submissions.push(submission);
      }
    }
  }

  // Calculate scores for each user
  const scores: RiderScore[] = [];

  for (const [, userData] of userMap) {
    const setsCount = userData.sets.length;
    const submissionsCount = userData.submissions.length;
    const points = calculatePoints(setsCount, submissionsCount);

    // Find the latest set and submission times
    let lastSetAt: Date | null = null;
    for (const set of userData.sets) {
      if (!lastSetAt || set.createdAt > lastSetAt) {
        lastSetAt = set.createdAt;
      }
    }

    let lastSubmissionAt: Date | null = null;
    for (const sub of userData.submissions) {
      if (!lastSubmissionAt || sub.createdAt > lastSubmissionAt) {
        lastSubmissionAt = sub.createdAt;
      }
    }

    scores.push({
      user: userData.user,
      setsCount,
      submissionsCount,
      points,
      lastSetAt,
      lastSubmissionAt,
      rank: 0, // Will be set after sorting
    });
  }

  // Sort by the comparison function
  scores.sort(compareRiders);

  // Assign ranks (1-indexed)
  for (const [i, score] of scores.entries()) {
    score.rank = i + 1;
  }

  return scores;
}
