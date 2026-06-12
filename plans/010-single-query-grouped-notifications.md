# Plan 010: Collapse the grouped-notifications N+1 into a single query

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9653040..HEAD -- apps/web/src/lib/notifications/ops.server.ts apps/web/src/lib/notifications/notifications.integration.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (009 touches sibling files in `lib/notifications/`;
  execute on separate branches and rebase whichever lands second — the
  overlap is import-level at most)
- **Category**: perf
- **Planned at**: commit `9653040`, 2026-06-12

## Why this matters

`listGroupedNotifications` powers the notifications page
(`src/routes/_authed/notifications/index.tsx`, loaded with `limit: 50`). It
runs one aggregate query to build the groups, then **one additional query per
group** to fetch every row in that group (with an actor join) just to extract
the 3 most-recent distinct actors. A user with 50 notification groups triggers
51 queries; a group with 200 likes fetches all 200 rows to keep 3. One query
with a lateral join does the whole job — fewer round trips, no over-fetch,
same result shape.

## Current state

- `apps/web/src/lib/notifications/ops.server.ts:68-160` —
  `listGroupedNotifications`. Phase 1 (lines 87-106) groups in SQL:

```ts
const grouped = await db
  .select({
    type: notifications.type,
    entityType: notifications.entityType,
    entityId: notifications.entityId,
    count: count(),
    latestId: sql<number>`MAX(${notifications.id})`,
    latestAt: sql<Date>`MAX(${notifications.createdAt})`,
    isRead: sql<boolean>`COUNT(*) FILTER (WHERE ${notifications.readAt} IS NULL) = 0`,
    data: sql<string>`(array_agg(${notifications.data}::text ORDER BY ${notifications.createdAt} DESC))[1]`,
  })
  .from(notifications)
  .where(and(...whereConditions))
  .groupBy(notifications.type, notifications.entityType, notifications.entityId)
  .orderBy(sql`MAX(${notifications.createdAt}) DESC`)
  .limit(limit)
```

Phase 2 (lines 108-159) is the N+1: `Promise.all(grouped.map(...))` where
each iteration runs `db.query.notifications.findMany` for ALL rows of the
group with the actor relation, then loops rows newest-first collecting the
first occurrence of each distinct actor, stopping at 3. Returned shape per
group:

```ts
{
  type, entityType, entityId, count, latestId, latestAt, isRead,
  actors,            // ≤3 of { id, name, avatarId }, ordered by most recent
  data: group.data ? JSON.parse(group.data) : null,
}
```

- Actor-dedupe semantics to preserve EXACTLY: actors are deduped by user id;
  ordering is by each actor's **most recent** notification in the group,
  descending; max 3; rows with `actor` null (no `actorId`) are skipped.
- `whereConditions` = `userId` match, plus `readAt IS NULL` when `unreadOnly`.
  The same unread filter applies to BOTH the grouping and the actor scan.
- Characterization tests already exist:
  `apps/web/src/lib/notifications/notifications.integration.test.ts:26`
  ("listGrouped groups by entity, orders latest-first, and dedupes actors by
  recency") and `:134` ("listGrouped unreadOnly filters out read groups and
  counts only unread rows"). These MUST pass unchanged.
- Table/columns (snake_case in SQL): `notifications(id, user_id, actor_id,
type, entity_type, entity_id, data, read_at, created_at)`; actors come from
  `users(id, name, avatar_id)`.
- Convention: server-only modules start with `import "@tanstack/react-start/server-only"`;
  raw SQL via the `sql` template from `drizzle-orm` is already used in this file.

## Commands you will need

| Purpose           | Command                            | Expected on success                                                    |
| ----------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Install           | `bun install` (repo root)          | exit 0                                                                 |
| Typecheck         | `bun run --filter web typecheck`   | exit 0                                                                 |
| Integration tests | `bun test:integration` (repo root) | all pass (needs local Postgres; `docker-compose up -d` if not running) |
| Full gate         | `bun preflight` (repo root)        | all checks pass                                                        |

## Scope

**In scope** (the only files you should modify):

- `apps/web/src/lib/notifications/ops.server.ts` (only `listGroupedNotifications`)
- `apps/web/src/lib/notifications/notifications.integration.test.ts` (add cases only)

**Out of scope** (do NOT touch):

- The returned shape — `src/routes/_authed/notifications/index.tsx` and
  `src/lib/notifications/index.ts` consume it as-is.
- `listNotifications`, `getUnreadCount`, mark/delete functions in the same file.
- Any schema/index change.

## Git workflow

- Branch: `advisor/010-single-query-grouped-notifications`
- Commit style: short imperative summary, e.g. `Fetch grouped notifications in a single query`; no attribution trailers.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add integration coverage for the over-fetch edge (before refactor)

In `notifications.integration.test.ts`, add one test alongside the existing
`listGrouped` tests: a group with 5+ notifications from 5 distinct actors
returns exactly 3 actors, ordered by each actor's most recent notification
descending, and `count` reflects all rows. (If the existing test at line 26
already asserts exactly this with ≥4 actors, skip this step and note it.)

**Verify**: `bun test:integration` → all pass against the CURRENT
implementation.

### Step 2: Replace the two-phase implementation with one query

Rewrite the body of `listGroupedNotifications` to a single `db.execute(sql\`...\`)`(keep the function signature and return type identical). Target SQL — adapt
identifiers via drizzle`sql` interpolation of the table objects where
practical, or use a raw query with parameter bindings:

```sql
WITH groups AS (
  SELECT
    type,
    entity_type,
    entity_id,
    count(*)::int                                            AS count,
    max(id)::int                                             AS latest_id,
    max(created_at)                                          AS latest_at,
    (count(*) FILTER (WHERE read_at IS NULL)) = 0            AS is_read,
    (array_agg(data::text ORDER BY created_at DESC))[1]      AS data
  FROM notifications
  WHERE user_id = ${userId}
    AND (${unreadOnly} = false OR read_at IS NULL)
  GROUP BY type, entity_type, entity_id
  ORDER BY max(created_at) DESC
  LIMIT ${limit}
)
SELECT
  g.*,
  COALESCE(a.actors, '[]'::json) AS actors
FROM groups g
LEFT JOIN LATERAL (
  SELECT json_agg(
           json_build_object('id', s.id, 'name', s.name, 'avatarId', s.avatar_id)
           ORDER BY s.last_at DESC
         ) AS actors
  FROM (
    SELECT u.id, u.name, u.avatar_id, max(n.created_at) AS last_at
    FROM notifications n
    JOIN users u ON u.id = n.actor_id
    WHERE n.user_id = ${userId}
      AND n.type = g.type
      AND n.entity_type = g.entity_type
      AND n.entity_id = g.entity_id
      AND (${unreadOnly} = false OR n.read_at IS NULL)
    GROUP BY u.id, u.name, u.avatar_id
    ORDER BY max(n.created_at) DESC
    LIMIT 3
  ) s
) a ON true
ORDER BY g.latest_at DESC
```

Then map rows to the existing return shape:

```ts
return result.map((row) => ({
  type: row.type,
  entityType: row.entity_type,
  entityId: row.entity_id,
  count: row.count,
  latestId: row.latest_id,
  latestAt: row.latest_at,
  isRead: row.is_read,
  actors: row.actors, // json_agg already yields parsed objects via postgres.js
  data: row.data ? JSON.parse(row.data) : null,
}))
```

Implementation notes:

- `db.execute(sql\`...\`)`with drizzle returns driver rows; check how other
raw queries in this repo type their results (e.g. the`sql<...>`casts in
this same file) and add an explicit row`type`(use`type`, not
`interface`). Cast date columns to `Date`consistently with what the route
expects — the previous implementation returned`latestAt`from a`sql<Date>`aggregate; postgres.js returns`timestamp`columns as`Date`
  already.
- If `json_agg` comes back as a string rather than parsed JSON, `JSON.parse`
  it — assert via the integration tests, don't guess.
- The notification `type`/`entityType` columns are Postgres enums; type the
  row fields using the existing exported types from `~/db/schema`
  (`NotificationType`, `NotificationEntityType`).
- Make sure the `unreadOnly` flag is bound as a boolean parameter, not
  string-interpolated.

**Verify**: `bun run --filter web typecheck` → exit 0.
**Verify**: `bun test:integration` → ALL listGrouped tests pass unchanged
(including the test from step 1).

### Step 3: Full gate

**Verify**: `bun preflight` → all checks pass.

## Test plan

- Step 1 adds the multi-actor dedupe/ordering case (if not already covered).
- The two existing characterization tests (`:26`, `:134`) are the primary
  safety net — they must pass with zero edits. If either needs editing to
  pass, the rewrite changed behavior → STOP condition.
- Add one more case after the rewrite: a group whose notifications all have
  `actorId` null returns `actors: []` (system notifications like `review`) —
  the old code skipped null actors; `JOIN users` in the lateral does the same.
- Verification: `bun test:integration` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun preflight` exits 0
- [ ] `bun test:integration` exits 0; the two pre-existing listGrouped tests
      are byte-identical to before (`git diff` on the test file shows only
      ADDED tests)
- [ ] `grep -c "findMany" apps/web/src/lib/notifications/ops.server.ts` is
      exactly 1 (only `listNotifications` still uses it)
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Either pre-existing listGrouped integration test fails after the rewrite
  and the fix would require editing the test.
- The route or `index.ts` facade turns out to depend on a field not listed in
  the return-shape excerpt (search `notifications.grouped` consumers first).
- `db.execute` result typing fights you for more than two attempts — report
  the exact driver return shape you observed instead of `as any`-casting
  (non-null assertions and `any` violate repo lint rules).

## Maintenance notes

- If notification volume grows further, the next lever is an index matching
  the group scan (`user_id, type, entity_type, entity_id, created_at DESC`) —
  deliberately not added here; measure first.
- Plan 009 adds a `game_activity` notification type; it flows through this
  query untouched (grouping is type-agnostic).
- Reviewer should scrutinize: actor ordering semantics (most-recent first,
  dedupe by actor, cap 3) and the `unreadOnly` parameter reaching BOTH the
  CTE and the lateral subquery.
