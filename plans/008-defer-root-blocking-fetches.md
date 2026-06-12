# Plan 008: Stop blocking every page load on the full user list and presence data

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9653040..HEAD -- apps/web/src/routes/__root.tsx apps/web/src/components/online-indicator.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `9653040`, 2026-06-12

## Why this matters

The root route's `beforeLoad` awaits three sequential things before ANY page
on the site can render: the session, then (in parallel) the full user list
(`users.all`) and the online-presence snapshot (`presence.online`). This runs
on every SSR request — including anonymous visitors hitting the landing page
or `/intro` — and adds two extra server-function round trips + DB queries to
the critical path of every cold page load. The two queries exist only to feed
the sidebar's "N online" indicator and the command palette's user search,
neither of which is above-the-fold content. Removing them from the blocking
path improves TTFB for every page.

## Current state

- `apps/web/src/routes/__root.tsx` — root route; contains the blocking fetches:

```ts
// apps/web/src/routes/__root.tsx:53-64
beforeLoad: async ({ context }) => {
  const sessionData = await context.queryClient.ensureQueryData(
    session.get.queryOptions(),
  )

  await Promise.all([
    context.queryClient.ensureQueryData(users.all.queryOptions()),
    context.queryClient.ensureQueryData(presence.online.queryOptions()),
  ])

  return { session: sessionData }
},
```

- `apps/web/src/components/online-indicator.tsx` — the ONLY consumer of
  `presence.online` outside `src/lib/presence`. Two components use
  `useSuspenseQuery`, which would block SSR (or suspend with no boundary)
  once the root no longer pre-loads the data:

```tsx
// apps/web/src/components/online-indicator.tsx:85-108 (abridged)
function OnlineCount() {
  const { data } = useSuspenseQuery(presence.online.queryOptions())
  return <span>{data.total}</span>
}

function OnlineDropdownContent({ onNavigate }: { onNavigate: () => void }) {
  const { data } = useSuspenseQuery(presence.online.queryOptions())

  if (data.total === 0) return null
  ...
}
```

`OnlineCount` renders inside the dropdown trigger (NOT inside a Suspense
boundary). `OnlineDropdownContent` is wrapped in `<Suspense>` inside
`OnlineIndicator`.

- Consumers of `users.all` and why they are safe without the root ensure:
  - These routes already `ensureQueryData(users.all.queryOptions())` in their
    own loaders: `src/routes/_authed/tourney/create.tsx:55`,
    `src/routes/_authed/admin/tricks/$trickId/edit.tsx:27`,
    `src/routes/_authed/tricks/create.tsx:24`, `src/routes/tricks/$trickId.tsx:29`,
    `src/routes/_authed/vault/$videoId/suggest.tsx:54`,
    `src/routes/vault/$videoId/edit.tsx:53`.
  - `src/components/command-palette.tsx:677` (`SearchUsersPage`) uses
    `useSuspenseQuery(usersApi.all.queryOptions())`, but that component only
    mounts after a user opens the palette and navigates to user search — a
    client-side interaction, already wrapped in a `<Suspense>` boundary inside
    the palette's `CommandList`. It fetches lazily on first open; no SSR impact.

- `presence.online.queryOptions()` already has `staleTime: 15s` and
  `refetchInterval: 15s` (`src/lib/presence/index.ts:8-15`), so once the
  indicator mounts client-side, data arrives within one tick and stays fresh.

- Repo conventions that apply: `type` not `interface`; no `useEffect` (use
  derived state); `Boolean(value)` not `!!value`; user-facing static text
  lowercase. The CLAUDE.md rule "loaders must await ensureQueryData" applies
  to route-specific data needed for SSR content — the change here deliberately
  moves non-critical chrome data out of the loader, which is the point of the
  plan; do not "fix" other loaders while here.

## Commands you will need

| Purpose         | Command                             | Expected on success  |
| --------------- | ----------------------------------- | -------------------- |
| Install         | `bun install` (repo root)           | exit 0               |
| Full gate       | `bun preflight` (repo root)         | all checks pass      |
| Typecheck only  | `bun run --filter web typecheck`    | exit 0               |
| Unit tests only | `cd apps/web && bun test unit.test` | all pass             |
| Lint/format     | `bun run check` (repo root)         | exit 0, may auto-fix |

## Scope

**In scope** (the only files you should modify):

- `apps/web/src/routes/__root.tsx`
- `apps/web/src/components/online-indicator.tsx`

**Out of scope** (do NOT touch, even though they look related):

- `src/lib/presence/**` — keep `queryOptions` (staleTime/refetchInterval) as is.
- `src/components/command-palette.tsx` — its `useSuspenseQuery(users.all)` is
  already lazily mounted and Suspense-wrapped; no change needed.
- Route loaders that ensure `users.all` themselves — they are correct.
- `src/components/app-sidebar.tsx`, `src/components/mobile-nav.tsx` — they
  only render `<OnlineIndicator />`; the fix is inside the indicator.

## Git workflow

- Branch: `advisor/008-defer-root-blocking-fetches`
- Commit style: short imperative summary, e.g. `Defer users/presence fetches off the root critical path` (match `git log --oneline` style; no attribution trailers).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove the blocking Promise.all from the root beforeLoad

In `apps/web/src/routes/__root.tsx`, delete the `await Promise.all([...])`
block (lines 58–61) entirely, leaving only the session fetch:

```ts
beforeLoad: async ({ context }) => {
  const sessionData = await context.queryClient.ensureQueryData(
    session.get.queryOptions(),
  )

  return { session: sessionData }
},
```

Remove the now-unused imports of `presence` (`~/lib/presence`) and `users`
(`~/lib/users`) from `__root.tsx`.

**Verify**: `bun run --filter web typecheck` → exit 0.
**Verify**: `grep -n "users.all\|presence.online" apps/web/src/routes/__root.tsx` → no matches.

### Step 2: Make the online indicator fetch its own data without suspending

In `apps/web/src/components/online-indicator.tsx`:

1. Replace the `useSuspenseQuery` import with `useQuery` (from
   `@tanstack/react-query`).
2. Rewrite `OnlineCount` to tolerate missing data:

```tsx
function OnlineCount() {
  const { data } = useQuery(presence.online.queryOptions())
  return <span>{data?.total ?? 0}</span>
}
```

3. Rewrite `OnlineDropdownContent` the same way, with an early return:

```tsx
function OnlineDropdownContent({ onNavigate }: { onNavigate: () => void }) {
  const { data } = useQuery(presence.online.queryOptions())

  if (!data || data.total === 0) return null
  ...
}
```

4. Remove the `<Suspense>` wrapper around `<OnlineDropdownContent ... />` in
   `OnlineIndicator` and the `Suspense` import (it is no longer needed —
   nothing in this file suspends anymore).

**Verify**: `bun run --filter web typecheck` → exit 0.
**Verify**: `grep -n "useSuspenseQuery\|Suspense" apps/web/src/components/online-indicator.tsx` → no matches.

### Step 3: Full gate

**Verify**: `bun preflight` (repo root) → all checks pass.

## Test plan

No new tests: this change has no server-side logic and the affected components
have no existing test files. Correctness is covered by:

- typecheck (the `data?.total` narrowing forces the optional handling),
- existing unit + integration suites via `bun preflight` (must stay green),
- the greps in the done criteria (proves the blocking calls are gone).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun preflight` exits 0
- [ ] `grep -rn "users.all\|presence.online" apps/web/src/routes/__root.tsx` → no matches
- [ ] `grep -rn "useSuspenseQuery(presence" apps/web/src` → no matches
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `beforeLoad` in `__root.tsx` no longer matches the excerpt above
  (something else was added to the `Promise.all` since planning).
- You find any additional consumer of `presence.online` or `users.all` that
  relies on the root-level ensure (search first:
  `grep -rn "presence.online\|users.all" apps/web/src --include='*.tsx'`) and
  that consumer renders during SSR outside a Suspense boundary — list them
  and stop.
- `bun preflight` fails for reasons unrelated to your change, twice.

## Maintenance notes

- The "N online" count now renders `0` for the first client tick on a cold
  cache, then updates within the 15s polling cycle (usually instantly). If
  this placeholder is deemed ugly in review, the alternative is rendering
  nothing until `data` arrives — a one-line change in `OnlineCount`.
- If a future feature needs `users.all` during SSR on a specific route, add
  `ensureQueryData(users.all.queryOptions())` to THAT route's loader (the
  existing pattern in `src/routes/tricks/$trickId.tsx:29`), not back into the
  root.
- Reviewer should scrutinize: that no route renders a user-list-dependent
  component during SSR without its own loader ensure.
