# Plan 013: Integration tests for the three scheduled nitro tasks

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9653040..HEAD -- apps/web/server/tasks apps/web/src/lib/tasks`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (tests only — zero source changes)
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `9653040`, 2026-06-12

## Why this matters

The three scheduled tasks under `apps/web/server/tasks/` are the platform's
autonomous engine and have **zero test coverage**:

- `rius/rotate.ts` — the weekly rotation that archives the active RIU round,
  activates the upcoming one, and creates a new upcoming round. If it breaks,
  the flagship game silently stalls every Monday.
- `notifications/send-digests.ts` — email digests; eligibility logic
  (frequency, day, hour, unsubscribe), 7-day vs 1-month windows, and
  `emailedAt` marking that prevents re-sending. A window-bounding bug shipped
  before (fixed in commit `6a611fb`).
- `notifications/game-start-reminders.ts` — RIU start reminders; hour-window
  matching (a timing bug shipped before: `Math.round` fix in the file's own
  comment), per-RIU dedup via `emailRemindersSent`, opt-in filters.

These run on cron with no human watching. Tests are the only feedback loop.

## Current state

### How tasks are built and why they're directly testable

Each task is `export default defineTask({ meta, run })` from `"nitro/task"`.
**Verified during planning**: importing `"nitro/task"` under plain `bun`
prints `WARN Nitro runtime imports detected ... stub implementation` and
works — `defineTask` is a pass-through, and `await task.run()` executes the
real body. So tests simply import the task module and call `.run()`.

### The integration-test harness

- `bun test:integration` (repo root) runs
  `apps/web/src/scripts/run-integration-tests.ts`: starts an ephemeral Docker
  Postgres, pushes the schema, then runs `bun test` over the glob
  `src/**/*.integration.test.ts`. **Only files under `apps/web/src/` are
  picked up** — task tests must live in `src/` and import the task files
  relatively.
- Every integration test file imports from `~/testing/integration`
  (`apps/web/src/testing/integration.ts`): `truncatePublicTables()` (call in
  `beforeEach`), `seedUser()`, `seedMuxVideo()`, `waitFor()`, `randomId()`,
  `asUser()`. It refuses to run outside the Docker harness — never bypass
  that guard.
- Exemplar test structure: `apps/web/src/lib/games/rius/rius.integration.test.ts`
  (has local `seedRiu(status)` / `seedRiuSet({...})` helpers worth copying).

### Task 1: `apps/web/server/tasks/rius/rotate.ts` (60 lines, pure DB)

```ts
// the entire run() body:
// 1. UPDATE rius SET status='archived' WHERE status='active'  (returning)
// 2. UPDATE rius SET status='active'  WHERE status='upcoming' (returning)
// 3. INSERT INTO rius (status='upcoming')                     (returning)
// returns { result: { success: true, archived, activated, newRiuId } }
```

No email, no external calls. Import path from a test in
`apps/web/src/lib/tasks/`: `../../../server/tasks/rius/rotate`.

### Task 2: `apps/web/server/tasks/notifications/send-digests.ts` (238 lines)

Key logic (line refs against `9653040`):

- Module top: `const resendClient = new Resend(env.RESEND_API_KEY)` — must be
  mocked (see "Mocking Resend" below).
- Eligibility query (lines ~30-57): joins `userNotificationSettings` ×
  `users`, requires `emailDigestFrequency != 'off'`,
  `emailUnsubscribedAll = false`, `emailDigestHourUtc = <current UTC hour>`,
  AND (weekly: `emailDigestDayOfWeek = <current UTC day>` | monthly:
  `emailDigestDayOfMonth = <current UTC date>`).
- Per user: window = now − 7 days (weekly) or now − 1 month (monthly);
  fetches notifications `WHERE userId = .. AND emailedAt IS NULL AND
createdAt >= windowStart`; **skips the user if zero notifications**; groups
  by like/comment/follow types; sends one email via
  `resendClient.emails.send`; on success `UPDATE notifications SET
emailedAt = now()` (lines ~204-205) for the included ids.

### Task 3: `apps/web/server/tasks/notifications/game-start-reminders.ts` (195 lines)

- Module top: `new Resend(...)` — mock as above.
- Exits early (`sent: 0`) if no RIU with `status = 'upcoming'` exists.
- `getHoursUntilNextRotation()` (lines ~22-36): `Math.round` of ms until next
  Monday 00:00 UTC. NOT exported — tests must replicate it (copy the function
  body into the test file; it is 10 lines).
- Eligibility: `gameStartReminderEnabled = true` AND
  `emailUnsubscribedAll = false`; then in-JS filter
  `hoursUntilStart <= targetHours && hoursUntilStart > targetHours - 1`
  where `targetHours = user.gameStartReminderHoursBefore ?? 24`.
- Dedup: skips users with an `emailRemindersSent` row matching
  `(userId, reminderType: 'game_start', riuId)`; inserts that row after a
  successful send.
- Returns `{ result: { success, sent, skipped, errors, hoursUntilStart } }`.

### Mocking Resend (the established repo pattern)

`mock.module` from `bun:test` is already used in this repo
(`src/lib/invariant.unit.test.ts:6`, `src/lib/games/index.unit.test.ts`).
For the two notification tasks, BEFORE importing the task module:

```ts
import { beforeEach, describe, expect, it, mock } from "bun:test"

const sendMock = mock(() =>
  Promise.resolve({ data: { id: "email-id" }, error: null }),
)

mock.module("resend", () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

const { default: sendDigestsTask } =
  await import("../../../server/tasks/notifications/send-digests")
```

Reset with `sendMock.mockClear()` in `beforeEach`. NOTE on cross-file mock
leakage: `bun test` runs files in one process, and `mock.module` is global
once set. The glob runs files sorted, so `lib/auth/...` (which touches the
real resend client and tolerates send errors) runs BEFORE `lib/tasks/...` —
the mock cannot affect it. Do not reorder or rename files in a way that sorts
task tests before `lib/auth`.

### Conventions

- `type` not `interface`; no non-null assertions; `Boolean(x)` not `!!x`.
- Tests: `describe`/`it`/`expect` from `bun:test`; `beforeEach` calls
  `truncatePublicTables()` (and for these files, also clears mocks).

## Commands you will need

| Purpose           | Command                                                                                                                                                                                               | Expected on success             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Install           | `bun install` (repo root)                                                                                                                                                                             | exit 0                          |
| Typecheck         | `bun run --filter web typecheck`                                                                                                                                                                      | exit 0                          |
| Integration tests | `bun test:integration` (repo root)                                                                                                                                                                    | all pass (needs Docker running) |
| Single-file run   | `bun test:integration src/lib/tasks/rius-rotate.integration.test.ts` (from apps/web — check how run-integration-tests passes args; from repo root use `bun run --filter web test:integration <path>`) | targeted file passes            |
| Full gate         | `bun preflight` (repo root)                                                                                                                                                                           | all checks pass                 |

## Scope

**In scope** (the ONLY files you may create/modify):

- `apps/web/src/lib/tasks/rius-rotate.integration.test.ts` (create)
- `apps/web/src/lib/tasks/send-digests.integration.test.ts` (create)
- `apps/web/src/lib/tasks/game-start-reminders.integration.test.ts` (create)
- `apps/web/server/tasks/notifications/send-digests.ts` — ONLY the
  emailed-marking statement (scope amended 2026-06-12: a first executor
  proved at runtime that `.where(sql\`${notifications.id} =
  ANY(${notificationIds})\`)`at line ~205 throws`ERR_INVALID_ARG_TYPE`under postgres.js, so`emailedAt`is never set,`result.sent`is always 0, and the send is never recorded. Fix: import`inArray`from`drizzle-orm`and use`.where(inArray(notifications.id, notificationIds))`. No other change to
  this file.)

**Out of scope** (do NOT touch):

- The task files themselves (`apps/web/server/tasks/**`) — tests only. If a
  task appears to have a bug, write the test pinning CURRENT behavior, and
  report the suspected bug in NOTES.
- `src/testing/integration.ts` — use its helpers as-is.
- Any source file, schema, or config.

## Git workflow

- Branch: `advisor/013-scheduled-task-integration-tests`
- Commit per task file or as one commit; style: short imperative summary;
  no attribution trailers.
- Do NOT push or open a PR.

## Steps

### Step 1: Rotation task tests

Create `rius-rotate.integration.test.ts`. Import the task
(`../../../server/tasks/rius/rotate`), seed via drizzle inserts (copy the
`seedRiu` helper pattern from `rius.integration.test.ts`). Cases:

1. **Happy path**: seed one `active` + one `upcoming` RIU → `run()` →
   old active is `archived`, old upcoming is `active`, exactly one NEW
   `upcoming` row exists; result reports `archived: 1, activated: 1`.
2. **Cold start**: empty `rius` table → `run()` → no archived/activated
   (0/0), one new `upcoming` created.
3. **Two consecutive runs**: run twice from state (1) → after the second run
   there is exactly one `active` and one `upcoming`; the round that was
   upcoming in run 1 is now `active`. (Pins the weekly cycle invariant.)

**Verify**: `bun test:integration` → file passes.

### Step 2a: Fix the emailed-marking bug in send-digests

In `apps/web/server/tasks/notifications/send-digests.ts`: add `inArray` to
the existing `drizzle-orm` import and replace the marking statement's
`.where(sql\`${notifications.id} = ANY(${notificationIds})\`)`with`.where(inArray(notifications.id, notificationIds))`. Commit this fix as its
own commit (e.g. `Fix digest emailed-marking to use inArray`) BEFORE the
digest tests, so the tests in Step 2 verify the fix.

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 2: Digest task tests

Create `send-digests.integration.test.ts` with the Resend mock (see Current
state). Compute `now = new Date()` in the test and seed settings from it so
eligibility matches the task's own clock: `emailDigestHourUtc:
now.getUTCHours()`, `emailDigestDayOfWeek: now.getUTCDay()` (weekly user).
Seed notifications by direct insert into `notifications` (any type; set
`userId` to the digest recipient). Cases:

1. **Weekly happy path**: eligible user + 2 unemailed notifications →
   `run()` → `sendMock` called exactly once; recipient is the user's email;
   both notification rows now have `emailedAt` set; result `sent: 1`.
2. **Dedup across runs**: immediately `run()` again → `sendMock` NOT called
   again (notifications already `emailedAt`-marked → user skipped);
   result `sent: 0`.
3. **No notifications → skip**: eligible user, zero notifications →
   `sendMock` not called.
4. **Filters**: three non-eligible users — (a) `emailDigestFrequency: "off"`,
   (b) `emailUnsubscribedAll: true`, (c) `emailDigestHourUtc` set to
   `(now.getUTCHours() + 2) % 24` — each with an unemailed notification →
   `run()` → `sendMock` not called; their notifications keep
   `emailedAt: null`.
5. **Window bound**: eligible weekly user with one notification whose
   `createdAt` is 8 days ago (insert with explicit `createdAt`) → not
   included: if it's the user's ONLY notification, user is skipped and the
   old row stays `emailedAt: null`. (Pins the `6a611fb` window fix.)

**Verify**: `bun test:integration` → file passes.

### Step 3: Reminder task tests

Create `game-start-reminders.integration.test.ts` with the Resend mock.
Replicate `getHoursUntilNextRotation()` in the test file (copy the 10-line
function) and compute `hoursUntilStart` once per test. Cases:

1. **No upcoming RIU**: empty table → `run()` → result `sent: 0`,
   `sendMock` not called.
2. **Matching window sends + records**: seed an `upcoming` RIU + a user with
   `gameStartReminderEnabled: true`, `gameStartReminderHoursBefore:
<computed hoursUntilStart>` → `run()` → `sendMock` called once; an
   `emailRemindersSent` row exists with `(userId, 'game_start', riuId)`;
   result `sent: 1`.
3. **Dedup**: `run()` again → `sendMock` not called again; result counts the
   user under `skipped`.
4. **Non-matching window**: user with `gameStartReminderHoursBefore` far from
   the computed value (e.g. `computed + 48`, clamped to the schema's 1–72
   range — if computed + 48 > 72 use a value on the other side, e.g.
   `Math.max(1, computed - 48)`; assert your chosen value actually fails the
   filter `hoursUntilStart <= target && hoursUntilStart > target - 1`) →
   `sendMock` not called.
5. **Unsubscribed-all**: enabled user with `emailUnsubscribedAll: true` and a
   matching hours value → `sendMock` not called.

Timing note: `hoursUntilStart` is computed from the real clock by both the
test and the task milliseconds apart; `Math.round` makes the value stable
except within ~0.5s of an exact half-hour-boundary rollover — acceptable.
If you see a flake here, compute the value, and when
`Math.abs(msUntilNextMonday % 3_600_000 - 1_800_000) < 5_000`, skip-with-log
rather than assert (document if you add this).

**Verify**: `bun test:integration` → file passes.

### Step 4: Full suite + gate

**Verify**: `bun test:integration` → ALL files pass (especially
`lib/auth/auth.integration.test.ts` — proves the Resend mock didn't leak
backwards).
**Verify**: `bun preflight` → all checks pass.

## Test plan

This plan IS the test plan (steps 1–3, 13 cases total). Structural pattern:
`rius.integration.test.ts`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun preflight` exits 0
- [ ] `bun test:integration` exits 0 and the output includes the three new
      files with ≥13 new passing tests total
- [ ] `git status` shows ONLY the three new test files (no source changes)
- [ ] `grep -rn "mock.module" apps/web/src/lib/tasks` → matches only in the
      two notification-task test files
- [ ] `plans/README.md` status row updated (unless reviewer maintains it)

## STOP conditions

Stop and report back (do not improvise) if:

- Importing a task module under the test harness fails (e.g. the nitro stub
  warning becomes an error, or `~/db` resolution breaks from `server/tasks`)
  — report the exact error; do NOT refactor task files to work around it.
- `mock.module("resend", ...)` demonstrably affects `auth.integration.test.ts`
  (it fails only when your files are present) — report; do not edit the auth
  test.
- Any test requires modifying a task file or schema to be testable.
- A task's actual behavior contradicts this plan's description of it (e.g.
  digests don't mark `emailedAt`) — the test you were about to write would
  pin a bug; report instead.

## Maintenance notes

- These tests pin task behavior at `9653040`. Plan 009 (separate branch) adds
  a `game_activity` notification type; it doesn't touch these tasks, but the
  digest grouping buckets (likes/comments/follows) silently ignore other
  types — a future digest change should extend the grouping and these tests.
- The reminder tests replicate `getHoursUntilNextRotation`; if the task's
  copy changes, the test copy must change too (the dedup/filter tests will
  catch drift loudly, the window test less so).
- Reviewer scrutiny: assert on DB rows + mock calls, not on logger output;
  no test should sleep/poll real time except via the existing `waitFor`.
