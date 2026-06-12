# Plan 011: Convert the vault list from offset to keyset pagination

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9653040..HEAD -- apps/web/src/lib/utv apps/web/src/routes/vault/index.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `9653040`, 2026-06-12

## Why this matters

The vault (unicycle.tv archive) list paginates with `OFFSET`: page N makes
Postgres produce and discard all rows of pages 1..N-1 — including the
per-video rider aggregation and the likes/messages count joins — before
returning 50 rows. Cost grows linearly with scroll depth on the site's
largest content collection. Keyset pagination makes every page cost the same
as page 1.

## Current state

- `apps/web/src/lib/utv/ops.server.ts:35-127` — `listUtvVideos`. Relevant
  bones:

```ts
export async function listUtvVideos({ data: input }: {
  data: {
    cursor?: null | number
    disciplines?: string[]
    q?: string
    riders?: string[]
    sort?: "engagement" | "newest" | "oldest"
  }
}) {
  const likesSubquery = ...    // count() grouped by utvVideoLikes.utvVideoId, .as("likes_sq")
  const messagesSubquery = ... // count() grouped by utvVideoMessages.utvVideoId, .as("messages_sq")

  return await db
    .select({
      id: utvVideos.id,
      ... // title, legacyUrl, disciplines, riders (correlated array_agg), scale,
      ... // thumbnailSeconds, assetId, playbackId,
      likesCount: sql<number>`COALESCE(${likesSubquery.count}, 0)`,
      messagesCount: sql<number>`COALESCE(${messagesSubquery.count}, 0)`,
    })
    .from(utvVideos)
    .leftJoin(muxVideos, ...)
    .leftJoin(likesSubquery, ...)
    .leftJoin(messagesSubquery, ...)
    .where(and(/* q ilike, disciplines ?| , riders EXISTS */))
    .orderBy(
      input.sort === "oldest"
        ? asc(utvVideos.id)
        : input.sort === "newest"
          ? desc(utvVideos.id)
          : sql`COALESCE(${likesSubquery.count}, 0) DESC`,
      desc(utvVideos.id),
    )
    .limit(PAGE_SIZE)
    .offset(input.cursor ?? 0)          // ← the offset to eliminate
}
```

Note the default sort (no `sort` or `"engagement"`) orders by
`likes count DESC, id DESC` — a composite key. `"newest"` = `id DESC,
  id DESC` (second key redundant but harmless); `"oldest"` = `id ASC, id DESC`
(the trailing `desc(id)` is a no-op tiebreaker since the first key is
already unique).

- `apps/web/src/lib/utv/schemas.ts` — `listUtvVideosSchema` declares `cursor`
  (numeric offset today). The cursor is ONLY used as the infinite-query page
  param; it is not a URL search param (`src/routes/vault/index.tsx`
  `validateSearch` covers q/disciplines/riders/sort only).

- `apps/web/src/lib/utv/core.ts:40-63` — the facade's infinite query:

```ts
list: {
  fn: listUtvVideosServerFn,
  schema: listUtvVideosSchema,
  infiniteQueryOptions: (data) => {
    return infiniteQueryOptions({
      queryKey: ["utv.list", data],
      queryFn: ({ pageParam: cursor }) => {
        return listUtvVideosServerFn({ data: { ...data, cursor } })
      },
      initialPageParam: 0 as number | undefined,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < PAGE_SIZE) {
          return
        }
        return allPages.reduce((sum, page) => sum + page.length, 0)  // ← offset math
      },
    })
  },
},
```

- `src/routes/vault/index.tsx:31-32,153` — loader uses
  `ensureInfiniteQueryData(utv.list.infiniteQueryOptions(deps))`; component
  uses `useSuspenseInfiniteQuery`. Neither inspects the cursor value.

- Other keyset implementations in this repo to use as pattern references:
  `listUsers` (`src/lib/users/ops.server.ts:~111`, `gt(users.id, cursor)`)
  and `listNotifications` (`src/lib/notifications/ops.server.ts:35-37`,
  `lt(notifications.id, cursor)` + `limit + 1` / `nextCursor` convention).

- Tests: `apps/web/src/lib/utv/utv.integration.test.ts` exists — extend it.

- Conventions: `type` not `interface`; no non-null assertions; zod schemas in
  `schemas.ts` validate server-fn input.

## Commands you will need

| Purpose           | Command                            | Expected on success                                                    |
| ----------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Install           | `bun install` (repo root)          | exit 0                                                                 |
| Typecheck         | `bun run --filter web typecheck`   | exit 0                                                                 |
| Integration tests | `bun test:integration` (repo root) | all pass (needs local Postgres; `docker-compose up -d` if not running) |
| Full gate         | `bun preflight` (repo root)        | all checks pass                                                        |

## Scope

**In scope** (the only files you should modify):

- `apps/web/src/lib/utv/ops.server.ts` (only `listUtvVideos`)
- `apps/web/src/lib/utv/schemas.ts` (cursor type)
- `apps/web/src/lib/utv/core.ts` (infinite query param plumbing)
- `apps/web/src/routes/vault/index.tsx` (ONLY the page-flattening line —
  scope amended 2026-06-12 after a first executor verified `:156` does
  `videosPages.pages.flat()`, which the new page shape breaks)
- `apps/web/src/lib/utv/utv.integration.test.ts` (add cases)

**Out of scope** (do NOT touch):

- Any change to `src/routes/vault/index.tsx` beyond converting the page
  flattening to the new shape (no filter/loader/UI changes).
- The likes/messages count subqueries and the riders aggregation — same
  query shape, only pagination changes.
- Caching/denormalizing the engagement score (noted as future work).

## Git workflow

- Branch: `advisor/011-vault-keyset-pagination`
- Commit style: short imperative summary, e.g. `Paginate vault list by keyset
instead of offset`; no attribution trailers.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Characterization test on current behavior

In `utv.integration.test.ts`, add a test that seeds ≥ `PAGE_SIZE + 5` videos
(check how existing tests in that file seed `utvVideos`; reuse their helpers)
and asserts for each of the three sorts: page 1 returns `PAGE_SIZE` rows,
page 2 returns the remainder, no overlap, no gaps, correct order. Write the
assertions against ROW CONTENT (ids/order), not against cursor values, so the
same test passes after the keyset rewrite. Run it against the current
implementation first.

**Verify**: `bun test:integration` → new test passes pre-rewrite.

### Step 2: Server — keyset WHERE + nextCursor

Change `listUtvVideos`:

1. New cursor format: an opaque string `"<likesCount>|<id>"` for the
   engagement sort, `"<id>"` for newest/oldest. Type it as
   `cursor?: string | null` in the function signature and in
   `listUtvVideosSchema` (`cursor: z.string().optional()` — check the current
   schema entry and mirror its optionality).
2. Parse the cursor at the top of the function (split on `|`, `Number(...)`
   each part; if any part is `NaN`, treat as no cursor).
3. Add keyset conditions into the existing `and(...)`:
   - `newest`: `lt(utvVideos.id, cursorId)`
   - `oldest`: `gt(utvVideos.id, cursorId)`
   - `engagement` (default): row-value comparison —
     `sql\`(COALESCE(${likesSubquery.count}, 0), ${utvVideos.id}) < (${cursorLikes}, ${cursorId})\``This matches the existing`ORDER BY likes DESC, id DESC` exactly.
4. Remove `.offset(...)`. Keep `.limit(PAGE_SIZE)`.
5. Change the return value from a bare array to
   `{ items, nextCursor }` following the `listNotifications` convention:
   fetch `PAGE_SIZE + 1` rows, slice to `PAGE_SIZE`, and compute `nextCursor`
   from the LAST returned row (`"${row.likesCount}|${row.id}"` for
   engagement, `String(row.id)` otherwise); `undefined` when no more pages.

**Verify**: `bun run --filter web typecheck` → errors ONLY in `core.ts` and
the route/test files that consume the old array shape (expected — next step).

### Step 3: Facade — cursor plumbing

In `core.ts`:

```ts
initialPageParam: undefined as string | undefined,
getNextPageParam: (lastPage) => lastPage.nextCursor,
```

and update the consumers (verified by a prior executor's grep — these are ALL
of them):

- `src/routes/vault/index.tsx:156` — change `videosPages.pages.flat()` to
  `videosPages.pages.flatMap((p) => p.items)`. This is the ONLY route edit
  allowed.
- `src/routes/vault/$videoId/edit.tsx:91` uses only
  `utv.list.infiniteQueryOptions({}).queryKey` for cache invalidation —
  unaffected by the page shape; do NOT edit it.

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 4: Re-run characterization + new edge tests

Update the step-1 test ONLY in how it requests page 2 (pass the returned
`nextCursor` instead of an offset) — the row-content assertions stay
identical. Add: (a) two videos with EQUAL like counts paginate without
duplication across a page boundary under engagement sort (the id tiebreaker);
(b) `nextCursor` is `undefined` on the final page; (c) a malformed cursor
string behaves like no cursor (returns page 1).

**Verify**: `bun test:integration` → all pass.

### Step 5: Full gate

**Verify**: `bun preflight` → all checks pass.

## Test plan

Covered in steps 1 and 4. Pattern file: the existing
`utv.integration.test.ts` (seeding helpers) and
`notifications.integration.test.ts:188` ("paginates by cursor") for
cursor-style assertions.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun preflight` exits 0
- [ ] `grep -n "offset(" apps/web/src/lib/utv/ops.server.ts` → no matches
- [ ] `bun test:integration` exits 0, including the pagination tests for all
      three sorts + tie/terminal/malformed-cursor cases
- [ ] `git status` shows no modified files outside the in-scope list (unless
      the operator approved adding the vault route after a STOP report)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Fixing the vault route requires touching anything beyond the single
  page-flattening expression at `src/routes/vault/index.tsx:156`.
- Any OTHER consumer of `listUtvVideosServerFn` or `utv.list` exists beyond
  `core.ts`, `vault/index.tsx`, and `vault/$videoId/edit.tsx` (queryKey only)
  — re-run the grep to confirm.
- The engagement-sort row-value comparison can't be expressed against the
  `likesSubquery` alias (drizzle alias scoping) after two attempts — report
  the generated SQL.

## Maintenance notes

- Keyset on a live aggregate (like count) means a video whose like count
  changes mid-scroll can shift pages — the same anomaly existed with OFFSET;
  no regression, but worth knowing.
- Future lever (deliberately deferred): denormalize an engagement score column
  onto `utv_videos` (updated on like/message writes) so the default sort can
  use a real index; revisit if vault grows past ~10k videos.
- Reviewer should scrutinize: the row-value comparison direction (`<` with
  `DESC, DESC` ordering) and that filters (q/disciplines/riders) AND-compose
  with the keyset condition.
