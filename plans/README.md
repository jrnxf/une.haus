# Implementation Plans

Run 1 generated 2026-06-10 against commit `127860b` (plans 001–007, all
merged). Run 2 generated 2026-06-12 against commit `9653040`, focused on
performance and engagement (plans 008–012). Execute in the order below unless
dependencies say otherwise. Each executor: read the plan fully before
starting, honor its STOP conditions, and update your row when done.

Selection note: both runs were autonomous (no interactive selection). Plans
were written for the top findings by leverage. Other vetted findings are
listed under "Findings not yet planned" — promote any of them to a plan on
request.

## Execution order & status

| Plan | Title                                                             | Priority | Effort | Depends on | Status                                                                                                                                                                                                                                                                                                                                    |
| ---- | ----------------------------------------------------------------- | -------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001  | Harden passwordless email-code auth (brute-force + email-bombing) | P1       | M      | —          | MERGED onto `main` as `fd53c73`; reviewed — chose the fns.ts-threaded attempt (1c98dc0) over the buggy earlier one; full preflight on main green (unit + integration pass)                                                                                                                                                                |
| 002  | Sign unsubscribe links (fix forgeable unsubscribe IDOR)           | P1       | S      | —          | MERGED onto `main` as `a8d1284`; reviewed — typecheck/lint/fmt clean, 7/7 token unit tests pass                                                                                                                                                                                                                                           |
| 003  | Add Postgres indexes for activity-feed / round / digest queries   | P2       | S      | —          | MERGED onto `main` as `a30a55d`; reviewed — diff is pure reformat + 10 indexes, no column dropped. NOTE: prod deploy's `drizzle-kit push` failed on a pre-existing enum drift (`2BP01`) — superseded by plan 006, which ships these indexes as migration `0001`                                                                           |
| 004  | Serialize active-round creation with advisory locks               | P2       | S      | —          | MERGED onto `main` as `a6fde94`; reviewed — locks 7110×2 / 7210×1, all reads/writes on `tx`; new concurrency integration test passed in full preflight on main                                                                                                                                                                            |
| 005  | Make `bun preflight` show why a check failed                      | P2       | S      | —          | MERGED onto `main` as `500487b`; reviewed — 0 `"ignore"` / 2 `"pipe"`, failure-path confirmed live (it correctly surfaced the plans/\*.md format diff)                                                                                                                                                                                    |
| 006  | Switch prod migrations from `drizzle-kit push` to `migrate`       | P1       | M      | 003        | MERGED onto `main` as `697a0d3`; reviewed — `0001` = exactly 10 `CREATE INDEX`, no destructive DDL; `drizzle-kit generate` reports no drift (meta ↔ schema consistent); preflight green. Prod baselined + deployed — 10 indexes confirmed live                                                                                            |
| 007  | Schema/migration drift guardrail (preflight + CI)                 | P2       | S      | 006        | MERGED onto `main` as `2e7d381`; reviewed — `db:check` runs `drizzle-kit generate` and fails if schema is ahead of migrations; positive (in-sync, exit 0) + negative (drift → exit 1, self-cleaning) tests pass; wired into preflight + ci.yml                                                                                            |
| 008  | Stop blocking every page on the user list + presence fetches      | P1       | S      | —          | MERGED onto `main` as `50da810` (cherry-picked); reviewed — diff matches plan exactly (2 files, +7/−16), all greps clean; full preflight green on merged main                                                                                                                                                                             |
| 009  | Notify game participants when someone responds to their set       | P1       | M      | —          | MERGED onto `main` as `cee7f9f`..`3d5c815` (8 commits, cherry-picked); reviewed — migration `0002` is exactly ADD VALUE + ADD COLUMN; full preflight green on merged main                                                                                                                                                                 |
| 010  | Collapse the grouped-notifications N+1 into a single query        | P2       | M      | —          | MERGED onto `main` as `e519c8f` (cherry-picked); reviewed — CTE+LATERAL matches plan, characterization tests byte-identical; full preflight green on merged main                                                                                                                                                                          |
| 011  | Convert the vault list from offset to keyset pagination           | P2       | M      | —          | MERGED onto `main` as `2fa6122` (cherry-picked); scope amended mid-run to allow the 1-line route flatten fix (first executor STOPped correctly); full preflight green on merged main                                                                                                                                                      |
| 012  | Cache the /metrics aggregates with a server-side TTL              | P3       | S      | —          | MERGED onto `main` as `18c7ab5` (cherry-picked); reviewed — promise-caching + failure eviction verified by 5 unit tests; full preflight green on merged main                                                                                                                                                                              |
| 013  | Integration tests for the three scheduled nitro tasks             | P1       | M      | —          | MERGED onto `main` as `1a0b3a1`..`52eaa70` (6 commits, cherry-picked); 13 task tests + a REAL BUG FOUND AND FIXED: digest `emailedAt` marking used `= ANY(${array})` which throws under postgres.js, so digests never recorded sends (`7f1310d` on main switches to `inArray`; dedup test proves it); full preflight green on merged main |
| 014  | Integration tests for glossary review, arcade, admin counts       | P2       | S–M    | —          | MERGED onto `main` as `0c3d534` (cherry-picked); 14 tests, cross-table approve effects asserted, all six pending-count sources seeded; full preflight green on merged main                                                                                                                                                                |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (one-line reason) | REJECTED (one-line rationale)

## Dependency notes

- Run 1 (001–007): all merged; see status column.
- Run 2 (008–012): all five are independent and can run in parallel on
  separate branches. 009 and 010 both touch `src/lib/notifications/` (sibling
  files) — rebase whichever lands second.

## Findings not yet planned (vetted, available to promote)

From run 2 (2026-06-12, perf + engagement focus):

- **BIU rounds page payload is unbounded (perf, M).** `getChains`
  (`apps/web/src/lib/games/bius/ops.server.ts:79-113`) fetches every chain ×
  every set × every like (each with a joined user) with no limit. BIU chains
  grow monotonically by design, so this payload grows forever. Best fixed
  together with BIU archiving (below) since archiving naturally bounds the
  active set; a standalone fix would trim the select to what the rounds page
  renders.
- **Command palette loads eagerly on every page (perf, S–M).**
  `src/components/page-header.tsx:44` renders `<CommandPalette />`
  (23KB source + cmdk + fzf + virtualizer) inside `PageHeaderRoot`, which
  nearly every route mounts. Lazy-load the palette (`React.lazy` +
  mount-on-first-open) to keep it out of the initial bundle. Verify hotkey
  registration still works when lazy before landing.
- **Per-recipient sequential notification inserts (perf, S).**
  `flagContent` (`src/lib/flags/ops.server.ts:94-107`) awaits
  `createNotification` once per admin; SIU archive flows
  (`src/lib/games/sius/ops.server.ts:280,360`) do the same per admin /
  participant. A `createNotifications(inputs[])` batch helper (one prefs
  query + one insert) fixes all sites. Low urgency at current admin counts.
- **In-app "round is live" announcement when RIU rotates (engagement, S–M,
  decision needed).** Rotation (`server/tasks/rius/*`) creates no in-app
  notification; reminder emails are opt-in and RIU-only. Audience is a
  product decision (all users vs. previous participants) — decide, then plan.

Direction options from run 2 (maintainer to weigh):

- **A followed-riders feed surface.** The intro promise ("your feed reflects
  the riders you actually care about", `src/routes/intro.$.tsx:124`) is
  technically delivered via `new_content` notifications, but there's no
  browsable feed — `posts.list` is global-only and the ActivityFeed component
  is per-profile. A `/feed` route (or a `following` filter on posts) is the
  natural next engagement surface; `notifyFollowers`, `userFollows`, and
  `getUserActivity` already provide the data model. Coarse effort: M–L.
- **BIU archiving / parity with SIU** — carried from run 1, still open and
  still the only game that permanently locks out (`startRound` counts every
  `bius` row ever, cap 3, no status column). Recommend a design plan.

Carried from run 1 (2026-06-10), still open:

- **Characterization tests for high-churn, zero-coverage mutation paths
  (tests, P2).** `lib/arcade/ops.server.ts` (`saveHighScore` monotonicity),
  `lib/admin/ops.server.ts` (`getPendingCount` aggregation),
  notification-preference enforcement in `lib/notifications/helpers.server.ts`
  (disabled pref → no notification), and the tricks approval workflows
  (`lib/tricks/**/ops.server.ts`, ~900 lines, no tests). Good "tests first"
  candidates before any refactor of those modules.
- **Unawaited notification cleanup before message delete (correctness, S).**
  `lib/messages/ops.server.ts:277-284` — `deleteNotificationsForMessage(...)` is
  fired with `.catch()` but not awaited before `db.delete(table)` runs, leaving
  orphan notifications. Low impact (a cleanup script exists), trivial fix
  (`await`). Fold into the next messages change.
- **Split the 52KB single-file `db/schema.ts` (tech-debt, M).** One god-file
  holds every table. Per-domain files re-exported from a barrel; zero logic
  change, low risk. Editor/merge ergonomics win, not urgent.
- **Stale `vite-v8-migration.md` (docs, S).** `apps/web/docs/vite-v8-migration.md`
  marked "blocked" on 2026-03-14; 3 months stale. Re-test Vite 8 upgrade and
  update or delete the doc.

Resolved since run 1: the vault offset-pagination finding is now plan 011;
the activity-feed 10-query fan-out was re-vetted in run 2 — the queries are
parallel, indexed, and the type filter already short-circuits; acceptable as
is (revisit only if a followed-riders feed builds on it).

Direction options carried from run 1 (for the maintainer to weigh):

- **Unify the three games' API surface.** `rius`/`sius`/`bius` implement the same
  engagement mechanic but diverge in naming and capabilities (RIU has
  `submissions` + admin rotate; SIU/BIU don't; `sets.add` vs `sets.backUp` vs
  `sets.createFirst`). A shared `Round`/`Set` facade would make parity visible
  and cut per-game drift. Trade-off: the games have genuine schema differences,
  so the abstraction must allow per-game hooks — over-generalizing is the risk.
- **Bring BIU to feature parity with SIU** (archivable rounds, vote-to-archive,
  auto top-up). Closes the lockout bug above and removes the asymmetry. Coarse
  effort: M–L.
- **`lib/tasks` is a stub** (`constants.ts` with a `TASK_NAMES` enum and nothing
  else). Either build out the task-runner abstraction the names imply, or delete
  the stub so it stops reading as a real subsystem.

## Findings considered and rejected

From run 2 (2026-06-12):

- **"Mentions not wired for game set comments"** — rejected. Mention
  notifications are handled centrally in `src/lib/messages/ops.server.ts`
  ("works for all message types including chat") and cover biuSet/siuSet/
  riuSet comments. Verified in code.
- **"Following promise undelivered / no following filter"** — downgraded. The
  intro copy's promise is delivered via `notifyFollowers` + `new_content`
  notifications (fires for posts and all three games' sets). A browsable feed
  remains a direction option (above), not a broken promise.
- **"Devtools shipped to production"** — rejected as by-design. The hidden
  trigger in `__root.tsx` is intentional ("our user profile opens it").
- **"Auth-code email send blocks the login request"** — noted, not planned.
  Awaiting Resend before responding is a deliberate UX/correctness choice
  (user must know the code was actually sent); fire-and-forget risks silent
  login failure.
- **`getUserActivity` 10-query fan-out** — re-vetted, acceptable (see
  "Resolved since run 1" above).
- **Admin `getPendingCount` 6 count queries per admin page load** — noted, low
  impact (admins only, status columns indexed, `Promise.all`). Fold into the
  `ttl-cache` helper from plan 012 if it ever shows up in logs.
- **`getContentOwner` per-call queries** — rejected; called once per mutation,
  not in loops. Not a bottleneck.
- **Presence/unread polling cadence (15s/30s)** — noted, acceptable. TanStack
  Query pauses interval refetches for unfocused tabs by default; combined
  endpoint or longer intervals only if tunnel load becomes visible.
- **Prerender static public routes (/terms, /privacy)** — not worth doing;
  SSR of these pages is trivially cheap on the current stack.

From run 1 (2026-06-10):

- **`react-grab` flagged as a stray prod dependency** — rejected. The import in
  `routes/__root.tsx:128` is `import.meta.env.DEV`-gated inside a `useEffect`, so
  it never ships to production. Not a real issue.
- **`tw-animate-css` flagged as unused** — rejected. It is imported in
  `apps/web/src/styles.css:2` (`@import "tw-animate-css"`). It is used.
- **`dangerouslySetInnerHTML` in `views/messages.tsx`** — downgraded, not
  planned. `scrollTargetId` is currently hardcoded, so there is no live injection
  path. Worth a defensive rewrite to `useEffect` if that file is touched, but not
  a standalone security fix today.
- **Pre-release deps (nitro 3 alpha, tsgo dev preview, h3 rc, pinned TanStack
  1.166.x)** — noted, not planned. Real supply-chain/stability risk, but bumping
  them is a judgment call the maintainer should drive (test matrix, changelog
  review), not a mechanical executor task. Revisit deliberately.
- **Duplicate hotkeys libs (`react-hotkeys-hook` + `@tanstack/react-hotkeys`)** —
  noted, low value. Both are used (`command-palette.tsx`/`split-timer.tsx` vs
  `global-shortcuts.tsx`); consolidating saves a small bundle slice. Not worth a
  dedicated plan now.
