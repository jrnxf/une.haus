# Plan 014: Integration tests for glossary review, arcade scores, and admin counts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9653040..HEAD -- apps/web/src/lib/tricks/glossary apps/web/src/lib/arcade apps/web/src/lib/admin`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW (tests only — zero source changes)
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `9653040`, 2026-06-12

## Why this matters

Three server-ops modules mutate or aggregate real data with zero test
coverage:

- `lib/tricks/glossary/ops.server.ts` (196 lines) —
  `reviewGlossaryProposal` is an admin workflow whose **approve path writes
  to other tables** (inserts into `trickElements`/`trickModifiers` for
  `action: "create"`, updates them for `action: "edit"`), has a double-review
  guard, and notifies the submitter. A regression here corrupts the trick
  glossary.
- `lib/arcade/ops.server.ts` — `saveHighScore` relies on SQL
  `greatest(arcadeHighScore, score)` for monotonicity. One refactor to a
  plain `set` silently lets scores go DOWN.
- `lib/admin/ops.server.ts` — `getPendingCount` sums pending work across 6
  tables; it feeds the admin badge. A miscount hides moderation work.

## Current state

### Harness (same for all integration tests)

- `bun test:integration` (repo root) starts ephemeral Docker Postgres and
  runs the glob `apps/web/src/**/*.integration.test.ts`.
- Shared helpers in `~/testing/integration`
  (`apps/web/src/testing/integration.ts`): `truncatePublicTables()` (call in
  `beforeEach`), `seedUser()`, `seedMuxVideo()`, `waitFor()`, `randomId()`,
  `asUser(user)` (builds the `{ context }` arg for ops).
- Structural exemplars:
  `apps/web/src/lib/tricks/submissions/trick-submissions.integration.test.ts`
  (review-workflow style assertions),
  `apps/web/src/lib/flags/flags.integration.test.ts` (flag seeding),
  `apps/web/src/lib/utv/utv.integration.test.ts` (utv suggestion seeding).

### Glossary ops — `apps/web/src/lib/tricks/glossary/ops.server.ts`

Exports: `listGlossaryProposals({ data: { status? } })`,
`getGlossaryProposal`, `createGlossaryProposal`, `reviewGlossaryProposal`.
Review logic (lines 111-196):

```ts
invariant(proposal, "Proposal not found")
invariant(proposal.status === "pending", "Proposal already reviewed")

if (status === "approved") {
  if (proposal.action === "create") {
    // type "element" → insert into trickElements { name, description }
    // else          → insert into trickModifiers { name, description }
  } else if (proposal.action === "edit" && proposal.targetId) {
    // applies diff.name / diff.description via UPDATE on the target table
  }
}
// then: UPDATE glossaryProposals SET status, reviewedByUserId, reviewedAt, reviewNotes
// then: if submitter !== reviewer → createNotification(type "review",
//        entityType "glossaryProposal", entityTitle = status) .catch(logRejection)
```

Note the rejected path applies NO glossary change. Inspect
`createGlossaryProposal` (lines 78-110) for the exact input shape (action,
type, name, description, targetId, diff) before seeding — seed proposals
through this op, not raw inserts, where practical.

### Arcade ops — `apps/web/src/lib/arcade/ops.server.ts` (whole file)

```ts
export async function getHighScore(userId: number) {
  // SELECT arcadeHighScore FROM users WHERE id = userId; returns row?.arcadeHighScore ?? 0
}

export async function saveHighScore({
  context,
  data,
}: {
  context: { user: { id: number } }
  data: { score: number }
}) {
  await db
    .update(users)
    .set({
      arcadeHighScore: sql`greatest(${users.arcadeHighScore}, ${data.score})`,
    })
    .where(eq(users.id, context.user.id))
}
```

### Admin ops — `apps/web/src/lib/admin/ops.server.ts` (whole file)

`getPendingCount()` returns the SUM of: `trickSubmissions` with
`status = 'pending'`, `trickSuggestions` pending, `trickVideos` pending,
`glossaryProposals` pending, `utvVideoSuggestions` pending, and `flags` with
`resolvedAt IS NULL`. Six `Promise.all`'d count queries.

### Conventions

- `type` not `interface`; no non-null assertions.
- Tests: `describe`/`it`/`expect` from `bun:test`; `beforeEach` →
  `truncatePublicTables()`.
- Ops that need auth take `{ context }` — build it with `asUser(user)` from
  the testing helpers (see any existing integration test).

## Commands you will need

| Purpose           | Command                            | Expected on success             |
| ----------------- | ---------------------------------- | ------------------------------- |
| Install           | `bun install` (repo root)          | exit 0                          |
| Typecheck         | `bun run --filter web typecheck`   | exit 0                          |
| Integration tests | `bun test:integration` (repo root) | all pass (needs Docker running) |
| Full gate         | `bun preflight` (repo root)        | all checks pass                 |

## Scope

**In scope** (the ONLY files you may create/modify — all new):

- `apps/web/src/lib/tricks/glossary/glossary.integration.test.ts` (create)
- `apps/web/src/lib/arcade/arcade.integration.test.ts` (create)
- `apps/web/src/lib/admin/admin.integration.test.ts` (create)

**Out of scope** (do NOT touch):

- The ops files themselves — tests only. Suspected bug → pin current
  behavior OR report in NOTES; never fix.
- `src/testing/integration.ts` and every existing test file.
- Any source file, schema, or config.

## Git workflow

- Branch: `advisor/014-untested-ops-integration-tests`
- Commit per module or as one commit; style: short imperative summary; no
  attribution trailers.
- Do NOT push or open a PR.

## Steps

### Step 1: Glossary review workflow tests

Create `glossary.integration.test.ts`. Seed a submitter + an admin reviewer
via `seedUser`. Create proposals via `createGlossaryProposal`. Cases:

1. **Approve create/element**: proposal `{ action: "create", type:
"element", name, description }` → review approved → a `trickElements` row
   with that name/description exists; proposal row has `status: "approved"`,
   `reviewedByUserId` = reviewer, `reviewedAt` set.
2. **Approve create/modifier**: same for `type: "modifier"` →
   `trickModifiers` row exists.
3. **Approve edit**: seed a `trickElements` row directly, create proposal
   `{ action: "edit", targetId, diff: { name: "new name" } }` → approve →
   the element's name is updated, description unchanged.
4. **Reject**: reject a create proposal → NO `trickElements`/`trickModifiers`
   row created; proposal `status: "rejected"`, `reviewNotes` persisted.
5. **Double-review guard**: reviewing an already-approved proposal throws
   ("Proposal already reviewed"); state unchanged.
6. **Submitter notification**: reviewer ≠ submitter → `waitFor` a
   `notifications` row for the submitter with `type: "review"`,
   `entityType: "glossaryProposal"`; reviewer == submitter → no notification.

### Step 2: Arcade tests

Create `arcade.integration.test.ts`. Cases:

1. New user → `getHighScore` returns 0 (or the seeded default).
2. `saveHighScore` 100 → `getHighScore` 100.
3. **Monotonicity**: then save 50 → still 100; then save 150 → 150.
4. Scoping: user B's save doesn't change user A's score.

### Step 3: Admin pending-count tests

Create `admin.integration.test.ts`. Cases:

1. Empty DB → `getPendingCount()` is 0.
2. Seed one PENDING row in each of the six sources (model the seeding on
   the exemplar tests listed in Current state; raw drizzle inserts are fine
   here) → returns 6.
3. Non-pending rows don't count: an `approved` trick submission and a
   RESOLVED flag (`resolvedAt` set) → count unchanged.

If seeding any individual source requires excessive FK scaffolding (more
than ~15 lines), cover the remaining sources with at least the
pending-vs-non-pending pair for the sources you did seed, and note exactly
which sources were skipped and why.

### Step 4: Full gate

**Verify**: `bun test:integration` → all pass.
**Verify**: `bun preflight` → all checks pass.

## Test plan

This plan IS the test plan (steps 1–3, ~13 cases). Structural pattern:
`trick-submissions.integration.test.ts`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun preflight` exits 0
- [ ] `bun test:integration` exits 0 and includes the three new files with
      ≥12 new passing tests total
- [ ] `git status` shows ONLY the three new test files (no source changes)
- [ ] `plans/README.md` status row updated (unless reviewer maintains it)

## STOP conditions

Stop and report back (do not improvise) if:

- `createGlossaryProposal`'s input shape doesn't match what
  `reviewGlossaryProposal` expects (would mean the workflow is already
  broken) — report, don't pin.
- Any case requires editing an ops file, the schema, or `testing/integration.ts`.
- Seeding the six admin-count sources requires touching more than the three
  in-scope files.

## Maintenance notes

- The glossary tests become the characterization safety net for any future
  refactor of the proposal workflow (it was flagged as a refactor risk in
  the run-1 audit).
- `getPendingCount` gains a new source whenever a new reviewable entity
  ships — extend test 2's seeded set then.
- Reviewer scrutiny: glossary tests must assert the CROSS-TABLE effects
  (trickElements/trickModifiers rows), not just the proposal row's status.
