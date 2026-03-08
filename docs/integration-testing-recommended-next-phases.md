# Recommended Next Integration Test Phases

This is the trimmed backlog after the current integration rollout. It only includes areas that still look worth covering with real Postgres integration tests under the strategy in [docs/testing.md](/Users/colby/Dev/une.haus/docs/testing.md).

The important context is that the integration layer is no longer just a proof of concept. The current suites already cover a broad mutation-heavy slice:

- messages
- notifications
- posts
- reactions
- follows
- flags
- notification settings
- SIUs
- BIUs
- RIUs
- tournament server flows
- trick submissions
- trick videos
- trick CRUD
- trick list cursor behavior
- user/profile persistence

What is left now is not "more of the same." The remaining high-value work falls into three buckets:

1. one still-dense moderation workflow that writes across multiple tables
2. read-model queries where joins, counts, and cursor logic can silently drift
3. a narrow auth/session slice where real persisted state matters more than mocked context

It intentionally excludes:

- external provider boundaries like `media` and `location`
- tiny write paths like `presence`
- broad framework plumbing where e2e or contract tests are a better fit

## Phase 6: Trick Suggestion Moderation

Reason: this is the clearest remaining mutation-heavy workflow that still has real persisted side effects and no matching integration suite yet.

Targets:

- `src/lib/tricks/submissions/fns.ts` -> `createSuggestionServerFn`
- `src/lib/tricks/submissions/fns.ts` -> `reviewSuggestionServerFn`

What makes it worth integration coverage:

- suggestion creation persists a diff blob tied to an existing trick
- approval mutates the target trick rather than creating a new one
- approval replaces element assignments from slug-based input
- approval adds and removes trick relationships by slug lookup
- review metadata and submitter notification are persisted as side effects

Coverage goals:

- base suggestion row creation for an existing trick
- rejection when the target trick does not exist
- approved suggestion applying simple field diffs to the target trick
- element replacement from slug input, including dropping old assignments
- relationship add/remove behavior from `diff.relationships`
- reviewed metadata persistence (`status`, `reviewedAt`, `reviewedByUserId`, `reviewNotes`)
- notify the original suggester on review
- reject double-review

Preferred deliverable:

- add `src/test/integration/trick-suggestions.integration.ts`
- keep it split into one creation test and a few approval/rejection tests rather than one giant "review everything" case

## Phase 7: Read-Model Query Integrity

Reason: the mutation-heavy server layer is already in much better shape. The next highest-value integration work is around real query behavior where joins, aggregate counts, and cursor rules can regress without obvious failures.

This phase should stay query-focused. Do not turn it into a catch-all suite.

### Phase 7A: User Activity Feed

Primary target:

- `src/lib/users/fns.ts` -> `getUserActivityServerFn`

Why this query is risky:

- it fans in multiple sources in parallel and merges them in memory
- it relies on timestamp ordering across heterogeneous row types
- it uses a timestamp-based cursor, which is a common place for duplicate/missing-row bugs
- it applies different filtering rules per source, including soft-delete exclusions

Coverage goals:

- mixed activity from posts, comments, BIU/SIU sets, RIU sets/submissions, trick submissions/suggestions/videos, and UTV suggestions all come back in newest-first order
- `type` filtering only returns the requested source
- pagination moves past the cursor without repeating or skipping rows in normal cases
- soft-deleted BIU/SIU sets do not leak into activity results
- joined parent metadata is present where the UI expects it

Preferred deliverable:

- add `src/test/integration/users-activity.integration.ts`

### Phase 7B: Game Archive Read Models

Primary targets:

- `src/lib/games/sius/fns.ts` -> `listArchivedRoundsServerFn`
- `src/lib/games/sius/fns.ts` -> `getArchivedRoundServerFn`

Why these are still worth covering even though RIU archive queries already have a suite:

- SIU archived list/get are route-critical read models and still untested
- `listArchivedRoundsServerFn` derives `setsCount` by filtering deleted sets in memory
- `getArchivedRoundServerFn` pulls a dense nested graph with users, videos, likes, messages, parent sets, and archive votes

Coverage goals:

- archived rounds are ordered by `endedAt` descending
- deleted SIU sets are excluded from `setsCount`
- non-archived rounds do not appear in archived results
- archived round detail returns the expected nested records for sets, parent sets, votes, likes, and messages
- archived round detail returns `null` for missing or non-archived rounds

Preferred deliverable:

- add `src/test/integration/sius-archive-read-model.integration.ts`

## Phase 8: Auth And Session Slice

Reason: auth still matters, but it should stay narrow and purpose-built. Most of the app's authenticated write behavior is already proved through implementation-level integration suites that inject `context.user`. What remains is the small set of behaviors that only a real session can prove.

Targets:

- `src/lib/auth/fns.ts` -> `enterCodeServerFn`
- `src/lib/auth/fns.ts` -> `registerServerFn`
- `src/lib/session/fns.ts` -> `getSessionServerFn`
- `src/lib/session/fns.ts` -> `clearSessionServerFn`

Scope guidance:

- focus on persisted auth-code rows and session state transitions
- do not try to broadly test TanStack middleware internals
- use e2e for redirect behavior and cookie transport semantics

Coverage goals:

- valid auth code logs in an existing user, deletes the code row, and populates session user state
- expired auth code is rejected and removed
- invalid auth code is rejected without creating session state
- valid code for an unknown email returns `user_not_found` and deletes the code row
- register creates a user and stores the session user payload
- `getSessionServerFn` returns flash once and clears it from stored session state
- `clearSessionServerFn` removes session state

Preferred shape:

- one dedicated `auth.integration.ts` suite
- if session plumbing is too framework-bound to test cleanly at the current seam, stop after documenting that constraint and rely on e2e for the remaining browser-cookie behavior

## Phase 9: Reporting Queries Only If They Matter Operationally

Reason: reporting SQL is a good fit for real-DB integration tests, but only if these pages are important enough to justify the maintenance cost. This phase is conditional, not automatic.

Primary targets:

- `src/lib/stats/fns.ts` -> `getStatsServerFn`
- `src/lib/stats/fns.ts` -> `getContributorsServerFn`

Why these are good candidates:

- both use large aggregate queries with unions, grouped counts, and left joins
- they can silently drift while still returning "valid-looking" shapes
- leaderboard ordering and null-handling are easy places for regressions

Coverage goals:

- headline counts match persisted fixtures
- monthly activity aggregation matches rows across the included source tables
- discipline distribution reflects stored user disciplines
- contributor points match the weighted formula
- users with no activity are excluded
- ordering stays stable when totals tie
- top-contributor limiting behaves as expected

Preferred deliverable:

- add one small `stats.integration.ts` suite rather than scattering these checks
- skip this phase entirely if the metrics pages are not operationally important

## Not Recommended For More DB Integration Right Now

- `src/lib/media`
  Prefer provider contract tests and one or two e2e flows.
- `src/lib/location`
  Prefer boundary tests with mocked provider responses.
- `src/lib/presence`
  Low complexity; unit or one tiny integration test only if it regresses.
- broad framework-only auth/session plumbing
  Prefer the narrow auth/session slice above plus e2e.
- already-covered mutation-heavy domains
  Keep extending an existing suite only when a new bug or risky branch appears.

## Recommended Order

1. Trick suggestions
2. User activity read-model integrity
3. SIU archive read models
4. Narrow auth/session slice
5. Stats/reporting queries only if the metrics pages matter enough to carry the test cost

## Stop Rule

If phases 6 through 8 are complete, stop and reassess before adding more integration tests.

At that point the likely best next move is not "more DB coverage everywhere." It is either:

- targeted additions to an existing suite when a regression exposes a weak spot, or
- e2e expansion for user-critical browser flows that still have coverage gaps
