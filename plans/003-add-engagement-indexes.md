# Plan 003: Add missing Postgres indexes for activity-feed, game-round, and digest queries

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 127860b..HEAD -- apps/web/src/db/schema.ts`
> If `schema.ts` changed since this plan was written, re-confirm every table's
> column names against the live file before adding indexes; on a mismatch with
> the excerpts below, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `127860b`, 2026-06-10

## Why this matters

Most engagement and game tables have **no indexes**. Only `notifications`,
`email_reminders_sent`, `trick_videos`, and `trick_relationships` define any
(`schema.ts:701-704, 761, 1408-1409, 1441-1442`). Two hot query shapes pay for
this on every request:

1. **Activity feed** (`apps/web/src/lib/users/ops.server.ts` `getUserActivity`)
   fans out across ~10 tables, each `WHERE user_id = ? ORDER BY created_at` —
   today every one is a sequential scan + sort.
2. **Game set/round pages** load sets by their round foreign key
   (`riu_id`/`biu_id`/`siu_id`) on the most-trafficked game routes — also
   sequential scans.
3. The hourly **digest task** (`server/tasks/notifications/send-digests.ts`)
   filters `notifications` by `user_id + emailed_at IS NULL + created_at >= ?`,
   which the existing single-column indexes only partially serve.

Indexes are additive and low-risk. This plan adds them to the Drizzle schema;
they take effect when the maintainer runs `bun run db:migrate` (out of scope for
the executor — see Maintenance notes).

## Current state

- `apps/web/src/db/schema.ts` — single 52KB file defining all tables. Drizzle
  index syntax is already used; the exemplar to copy is the `notifications`
  table callback:

  ```ts
  // schema.ts ~700-705
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_user_unread_idx").on(t.userId, t.readAt),
    index("notifications_grouping_idx").on(t.userId, t.entityType, t.entityId),
    index("notifications_created_at_idx").on(t.createdAt),
  ],
  ```

  `index` is already imported from `drizzle-orm/pg-core` at the top of the file
  (confirm: `grep -n "index" apps/web/src/db/schema.ts | head` shows it in the
  import and in existing `.on(...)` calls).

- Two table shapes exist in the file:
  - **Object-only tables** end with `})` and have no `(t) => [...]` callback yet
    (e.g. `posts` at line ~165). For these you ADD a callback as a second
    `pgTable` argument.
  - **Tables that already have a callback** end with `}, (t) => [ ... ])` (e.g.
    `riuSubmissions` ~473-494 with `unique().on(...)`). For these you ADD lines
    INSIDE the existing array.

- Verified column names (from the live schema) you will reference:
  - `posts`: `userId`, `createdAt` (lines 165-185)
  - `postMessages`: `userId`, `createdAt` (211-225)
  - `riuSets`: `userId`, `createdAt`, `riuId` (451-470)
  - `riuSubmissions`: `userId`, `createdAt`, `riuSetId` — **already has a
    `(t) => [unique().on(t.riuSetId, t.userId)]` callback** (473-494)
  - `biuSets`: `userId`, `createdAt`, `biuId` (505-525)
  - `siuSets`: `userId`, `createdAt`, `siuId` (578-600)
  - `notifications`: `userId`, `emailedAt`, `createdAt` — already has a callback
    (698-705)

## Commands you will need

| Purpose       | Command                                           | Expected on success     |
| ------------- | ------------------------------------------------- | ----------------------- |
| Typecheck     | `bun run --filter web typecheck`                  | exit 0, no errors       |
| Lint          | `bun run lint`                                    | exit 0                  |
| Format check  | `bunx oxfmt --check`                              | exit 0                  |
| Schema sanity | `cd apps/web && bunx drizzle-kit generate --help` | exits 0 (tool resolves) |

Do **not** run `bun run db:migrate` / `drizzle-kit push` — that mutates the
database and is the maintainer's deploy step.

## Scope

**In scope** (the only file you modify):

- `apps/web/src/db/schema.ts`

**Out of scope** (do NOT touch):

- `apps/web/src/lib/users/ops.server.ts` and any query code — this plan only
  adds indexes; query rewrites (e.g. UNION-ing the activity feed) are a separate
  larger effort, deliberately deferred.
- Running migrations or touching the database.
- Any table not listed in Step 1/2/3 below. If you think another table needs an
  index, note it in your report — do not add it.

## Git workflow

- Branch: `advisor/003-engagement-indexes`
- One commit: `Add indexes for activity feed, game rounds, and digest queries`.
- Do NOT push or open a PR unless instructed. No `Co-Authored-By` trailer.

## Steps

For every index below: the **name must be globally unique** in the file
(Postgres index names are global). Before adding each, confirm the named columns
exist in that table's decl (they're all in this one file). If a column is
missing or renamed vs the excerpts above, STOP.

### Step 1: Activity-feed composite indexes `(userId, createdAt)`

Add a `(userId, createdAt)` composite to each table. For object-only tables, add
the callback; for `riuSubmissions`, add the line inside its existing array.

- `posts` → `index("posts_user_created_idx").on(t.userId, t.createdAt)`
- `postMessages` → `index("post_messages_user_created_idx").on(t.userId, t.createdAt)`
- `riuSets` → `index("riu_sets_user_created_idx").on(t.userId, t.createdAt)`
- `riuSubmissions` → add `index("riu_submissions_user_created_idx").on(t.userId, t.createdAt)` inside the existing `(t) => [ ... ]`
- `biuSets` → `index("biu_sets_user_created_idx").on(t.userId, t.createdAt)`
- `siuSets` → `index("siu_sets_user_created_idx").on(t.userId, t.createdAt)`

Example of adding a callback to an object-only table (`posts`):

```ts
export const posts = pgTable(
  "posts",
  {
    // ...existing columns unchanged...
  },
  (t) => [index("posts_user_created_idx").on(t.userId, t.createdAt)],
)
```

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -c "_user_created_idx" apps/web/src/db/schema.ts` → 6.

### Step 2: Game-round foreign-key indexes

Sets are loaded by their round FK on game pages. Add:

- `riuSets` → `index("riu_sets_riu_id_idx").on(t.riuId)`
- `biuSets` → `index("biu_sets_biu_id_idx").on(t.biuId)`
- `siuSets` → `index("siu_sets_siu_id_idx").on(t.siuId)`

(Each goes into the same callback you created/edited in Step 1 for that table.)

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -cE "(riu|biu|siu)_sets_.*_id_idx" apps/web/src/db/schema.ts` → 3.

### Step 3: Digest composite index on `notifications`

Inside the existing `notifications` callback (lines ~700-705), add a composite
matching the digest query (`user_id` + `emailed_at` + `created_at`):

```ts
index("notifications_user_emailed_created_idx").on(
  t.userId,
  t.emailedAt,
  t.createdAt,
),
```

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -c "notifications_user_emailed_created_idx" apps/web/src/db/schema.ts` → 1.

### Step 4: Format and lint

**Verify**: `bunx oxfmt --check` → exit 0 (run `bun run format` if it reports
diffs, then re-check); `bun run lint` → exit 0.

## Test plan

There are no unit tests for schema definitions; correctness is "the schema
compiles and the index calls exist". Verification is the typecheck + grep counts
in each step. (Index _effectiveness_ is verified by the maintainer with `EXPLAIN`
after `db:migrate` — out of scope here.)

## Done criteria

ALL must hold:

- [ ] `bun run --filter web typecheck` exits 0
- [ ] `bun run lint` exits 0 and `bunx oxfmt --check` exits 0
- [ ] `grep -c "_user_created_idx" apps/web/src/db/schema.ts` → 6
- [ ] `grep -cE "(riu|biu|siu)_sets_.*_id_idx" apps/web/src/db/schema.ts` → 3
- [ ] `grep -c "notifications_user_emailed_created_idx" apps/web/src/db/schema.ts` → 1
- [ ] Only `apps/web/src/db/schema.ts` is modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A referenced column (`userId`, `createdAt`, `riuId`, `biuId`, `siuId`,
  `emailedAt`) is absent or renamed in the live table decl vs the excerpts.
- `index` is not importable / not already imported in `schema.ts`.
- Adding a callback to an object-only table breaks typecheck (you may have
  mis-paired the `pgTable("name", {...})` arguments — re-check the `riuSubmissions`
  example which already takes two args).
- Any verification count is off and you cannot reconcile it after one fix.

## Maintenance notes

- **These indexes do nothing until applied.** After this lands, the maintainer
  must run `bun run db:migrate` (drizzle-kit push) against each environment.
  Call this out in the PR description.
- Deferred, deliberately out of scope: rewriting `getUserActivity` to a single
  UNION ALL query (PERF finding) — these indexes make the current 10-query
  version acceptable; the rewrite is a separate plan if profiling still shows it
  hot after indexing.
- Reviewer should scrutinize: index-name uniqueness across the whole file, and
  that composite column order is `(userId, createdAt)` not reversed (order
  matters for the `WHERE user_id = ? ORDER BY created_at` access pattern).
- If the message/like tables (`*_messages`, `*_likes`) later show up hot, the
  same `(parentId)` / `(userId)` index pattern applies — not included now to keep
  the change reviewable.
