# Plan 012: Cache the /metrics aggregates with a server-side TTL

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9653040..HEAD -- apps/web/src/lib/stats`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `9653040`, 2026-06-12

## Why this matters

`getStats` runs ~34 aggregate queries in parallel (full-table `count(*)` on
~20 tables plus activity-by-month, discipline distribution, and a large
top-contributors UNION query) on every load of the public `/metrics` page.
`getContributors` repeats a near-identical contributors query. The numbers
move slowly; recomputing them per request is pure waste on a single-box
Postgres. A 5-minute in-process cache eliminates almost all of that load.
This deployment is a single bun process under systemd (see README "hosting"),
so module-level memory is a correct cache — no Redis needed.

## Current state

- `apps/web/src/lib/stats/ops.server.ts` — `getStats()` (lines 38-~265) and
  `getContributors()` (lines 268-344). Both are zero-argument, user-agnostic
  exports (no per-user data — safe to cache globally). Opening lines:

```ts
export async function getStats() {
  const [
    usersResult,
    postsResult,
    ...                       // ~34 destructured results
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(posts),
    ...
```

- `apps/web/src/lib/stats/fns.ts` — wraps both in `createServerFn()`.
- `apps/web/src/lib/stats/index.ts` — facade; client `queryOptions` already
  set `staleTime: 60 * 1000` with the comment "stats can be slightly stale",
  so product intent for staleness is established.
- Consumers: `src/routes/metrics/index.tsx` (`stats.get`), and
  `src/routes/metrics/users.tsx` (check which facade entry it uses — likely
  contributors).
- `apps/web/src/lib/stats/stats.integration.test.ts` — exercises these ops
  against a real DB; it asserts on fresh data, so the cache MUST be
  resettable from tests.
- Unit-test convention: colocated `*.unit.test.ts` run by
  `bun test unit.test` (e.g. `src/lib/invariant.unit.test.ts` — simple
  `describe`/`it`/`expect` from `bun:test`). Match it.
- Style: `type` not `interface`; no non-null assertions.

## Commands you will need

| Purpose           | Command                             | Expected on success                                                    |
| ----------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Install           | `bun install` (repo root)           | exit 0                                                                 |
| Typecheck         | `bun run --filter web typecheck`    | exit 0                                                                 |
| Unit tests        | `cd apps/web && bun test unit.test` | all pass                                                               |
| Integration tests | `bun test:integration` (repo root)  | all pass (needs local Postgres; `docker-compose up -d` if not running) |
| Full gate         | `bun preflight` (repo root)         | all checks pass                                                        |

## Scope

**In scope** (the only files you should modify):

- `apps/web/src/lib/ttl-cache.ts` (create)
- `apps/web/src/lib/ttl-cache.unit.test.ts` (create)
- `apps/web/src/lib/stats/ops.server.ts`
- `apps/web/src/lib/stats/stats.integration.test.ts` (cache reset only)

**Out of scope** (do NOT touch):

- The query bodies of `getStats`/`getContributors` — including the duplicated
  contributors SQL (dedupe is noted as follow-up, not this plan).
- Client `queryOptions` staleTime values.
- Any other expensive endpoint (admin counts, etc.) — one consumer first.

## Git workflow

- Branch: `advisor/012-cache-metrics-stats`
- Commit style: short imperative summary, e.g. `Cache stats aggregates for 5
minutes`; no attribution trailers.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Generic TTL wrapper

Create `apps/web/src/lib/ttl-cache.ts`:

```ts
type CacheEntry<T> = {
  value: Promise<T>
  expiresAt: number
}

export function ttlCache<T>(fn: () => Promise<T>, ttlMs: number) {
  let entry: CacheEntry<T> | null = null

  async function get(): Promise<T> {
    const now = Date.now()
    if (entry && entry.expiresAt > now) {
      return entry.value
    }
    const value = fn().catch((error: unknown) => {
      // don't cache failures
      entry = null
      throw error
    })
    entry = { value, expiresAt: now + ttlMs }
    return value
  }

  function clear() {
    entry = null
  }

  return { get, clear }
}
```

Notes: caching the _promise_ (not the resolved value) collapses concurrent
cold-cache requests into one DB pass; the catch handler evicts failed
promises so an outage doesn't get cached for 5 minutes.

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 2: Unit tests for the wrapper

Create `apps/web/src/lib/ttl-cache.unit.test.ts` (model the harness on
`src/lib/invariant.unit.test.ts`). Cases:

1. second call within TTL does not re-invoke `fn` (count invocations).
2. call after TTL expiry re-invokes `fn` (use a tiny TTL like 5ms and
   `await new Promise((r) => setTimeout(r, 10))`).
3. two concurrent cold calls invoke `fn` once (call `get()` twice without
   awaiting between them).
4. a rejected `fn` is not cached: first call rejects, second call re-invokes
   and succeeds.
5. `clear()` forces re-invocation.

**Verify**: `cd apps/web && bun test unit.test` → all pass, including 5 new.

### Step 3: Wrap the stats ops

In `apps/web/src/lib/stats/ops.server.ts`:

1. Rename the existing exports to `computeStats` / `computeContributors`
   (not exported, or exported only if the test needs them — prefer not).
2. Create cached instances and re-export under the ORIGINAL names so
   `fns.ts` needs no edits:

```ts
const STATS_TTL_MS = 5 * 60 * 1000

const statsCache = ttlCache(computeStats, STATS_TTL_MS)
const contributorsCache = ttlCache(computeContributors, STATS_TTL_MS)

export async function getStats() {
  return statsCache.get()
}

export async function getContributors() {
  return contributorsCache.get()
}

/** test-only: reset both caches */
export function clearStatsCaches() {
  statsCache.clear()
  contributorsCache.clear()
}
```

(If `getStats`/`getContributors` take a `{ context }`-style argument in the
live code — they don't at planning time, both are zero-arg — STOP.)

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 4: Keep integration tests deterministic

In `stats.integration.test.ts`, import `clearStatsCaches` and call it in a
`beforeEach` (add one if the file has none — check its current structure
first). Do not weaken any assertion.

**Verify**: `bun test:integration` → all pass.

### Step 5: Full gate

**Verify**: `bun preflight` → all checks pass.

## Test plan

- 5 unit cases for `ttlCache` (step 2).
- Existing `stats.integration.test.ts` stays green with `clearStatsCaches()`
  in `beforeEach` (step 4) — this also proves the cache is the only behavior
  change.
- Verification: `cd apps/web && bun test unit.test` and
  `bun test:integration` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun preflight` exits 0
- [ ] `apps/web/src/lib/ttl-cache.ts` and its unit test exist; 5 new unit
      cases pass
- [ ] `grep -n "ttlCache" apps/web/src/lib/stats/ops.server.ts` → ≥1 match
- [ ] `grep -rn "ttl-cache" apps/web/src --include='*.ts' -l` matches only
      the three expected files (no scope creep to other endpoints)
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `getStats`/`getContributors` are no longer zero-argument or now receive
  user context (per-user data must never be globally cached).
- `stats.integration.test.ts` fails in a way that `clearStatsCaches()` in
  `beforeEach` doesn't fix.
- You find an existing cache/memo utility in the repo (search
  `grep -rn "ttl\|memoize" apps/web/src/lib` first) — use it instead of
  creating a duplicate, and note the substitution.

## Maintenance notes

- The cache is per-process: a deploy/restart clears it; stats can be up to
  5 minutes stale on `/metrics`. Both match the existing client-side
  "stats can be slightly stale" intent.
- If the app ever runs more than one bun process, each holds its own cache —
  still correct, just N cold fills.
- Follow-up deliberately deferred: dedupe the near-identical top-contributors
  SQL between `computeStats` and `computeContributors`; and consider the same
  wrapper for `getPendingCount` (`src/lib/admin/ops.server.ts`) if admin
  traffic grows.
- Reviewer should scrutinize: that failures aren't cached, and that no
  per-user data sneaks into the cached payloads.
