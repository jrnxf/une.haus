# Plan 004: Serialize active-round creation so MAX_ACTIVE_ROUNDS is enforced atomically

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 127860b..HEAD -- apps/web/src/lib/games/sius/ops.server.ts apps/web/src/lib/games/bius/ops.server.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `127860b`, 2026-06-10

## Why this matters

`startSiuRound`, `topUpActiveRounds` (SIU), and `startRound` (BIU) all do
**check-then-act without a lock**: count active rounds, assert the count is below
`MAX_ACTIVE_ROUNDS` (3), then insert — outside any transaction. Two concurrent
requests can both read "2 active", both pass the invariant, and both insert,
leaving 4+ active rounds and breaking the UI's assumption that at most 3 exist.
The codebase already has the right tool for this: `createFirstSiuSet`
(`sius/ops.server.ts:82`) and `createFirstBiuSet` (`bius/ops.server.ts:36`) wrap
their read-then-write in `db.transaction` guarded by `pg_advisory_xact_lock`.
This plan applies the same pattern to round creation, using one game-wide lock
key per game (the cap is global per game, not per round).

## Current state

- `apps/web/src/lib/games/sius/ops.server.ts`:
  - `topUpActiveRounds` (lines ~27-42): counts `where status="active"`, computes
    deficit, inserts — no lock.
  - `startSiuRound` (lines ~44-58): counts `where status="active"`, `invariant(
count < MAX_ACTIVE_ROUNDS)`, inserts — no lock.
  - Exemplar lock already in this file — `createFirstSiuSet` (~82):
    ```ts
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(7101, ${input.roundId})`,
      )
      // ...reads and writes on tx...
    })
    ```
  - `MAX_ACTIVE_ROUNDS = 3` at line ~23. `sql` and `db` are already imported.
- `apps/web/src/lib/games/bius/ops.server.ts`:
  - `startRound` (lines ~116-129): `MAX_ACTIVE_ROUNDS = 3` at line ~77; counts
    **all** `bius` rows then inserts — no lock.
  - Exemplar lock — `createFirstBiuSet` (~36): `pg_advisory_xact_lock(7201, ...)`.
  - `sql` and `db` are already imported.

**Lock-key convention**: existing per-round locks use classid `7101` (SIU sets)
and `7201` (BIU sets) with the round id as the second arg. For these game-wide
round-creation locks, use a **single-argument** advisory lock with a distinct
classid so it never collides: `7110` for SIU round creation, `7210` for BIU.

**Conventions to follow:**

- Use `db.transaction(async (tx) => { ... })` and run all reads/writes on `tx`
  (not `db`) inside it — match `createFirstSiuSet`.
- `invariant(condition, message)` from `~/lib/invariant` (already imported) for
  the cap assertion.

## Commands you will need

| Purpose           | Command                                   | Expected on success |
| ----------------- | ----------------------------------------- | ------------------- |
| Typecheck         | `bun run --filter web typecheck`          | exit 0, no errors   |
| Integration tests | `cd apps/web && bun run test:integration` | all pass            |
| Lint              | `bun run lint`                            | exit 0              |
| Format check      | `bunx oxfmt --check`                      | exit 0              |

There is an existing concurrency test to model on:
`apps/web/src/lib/games/sius/sius.integration.test.ts` —
`"createFirstSiuSet serializes concurrent attempts so only one first set is
created"` (around line 377). Read it before Step 4.

## Scope

**In scope** (the only files you modify):

- `apps/web/src/lib/games/sius/ops.server.ts`
- `apps/web/src/lib/games/bius/ops.server.ts`
- `apps/web/src/lib/games/sius/sius.integration.test.ts` (add a case)

**Out of scope** (do NOT touch):

- `apps/web/src/lib/games/rius/ops.server.ts` — RIU round rotation has a
  different shape (archive + insert) and is handled by a scheduled task, not
  user concurrency; leave it for a separate review.
- **The BIU "counts all rounds" semantic bug.** `startRound` counts every `bius`
  row ever created (the `bius` table has no `status`/archiving), so BIU
  permanently caps at 3 chains total. That is a real bug but its fix requires a
  product decision + schema migration (mirror SIU's archivable-round model). This
  plan ONLY makes the existing count atomic — do NOT add a status column or
  change what `startRound` counts. See Maintenance notes.
- Any schema change / migration.

## Git workflow

- Branch: `advisor/004-serialize-rounds`
- One commit: `Serialize active-round creation with advisory locks`.
- Do NOT push or open a PR unless instructed. No `Co-Authored-By` trailer.

## Steps

### Step 1: Lock SIU `startSiuRound`

Wrap the count + invariant + insert in a transaction with a game-wide advisory
lock. Target shape:

```ts
export async function startSiuRound() {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7110)`)

    const activeRounds = await tx.query.sius.findMany({
      where: eq(sius.status, "active"),
      columns: { id: true },
    })

    invariant(
      activeRounds.length < MAX_ACTIVE_ROUNDS,
      `Maximum of ${MAX_ACTIVE_ROUNDS} active rounds reached`,
    )

    const [round] = await tx
      .insert(sius)
      .values({ status: "active" })
      .returning()

    return { round }
  })
}
```

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 2: Lock SIU `topUpActiveRounds`

Same treatment — use the **same** lock key `7110` (it guards the SIU active-round
count). Move its count + deficit + insert onto `tx` inside
`db.transaction(async (tx) => { await tx.execute(sql\`SELECT pg_advisory_xact_lock(7110)\`); ... })`.
Preserve the `if (deficit <= 0) return []` early-return inside the transaction.

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -c "pg_advisory_xact_lock(7110)" apps/web/src/lib/games/sius/ops.server.ts` → 2.

### Step 3: Lock BIU `startRound`

Wrap its existing (count-all) + invariant + insert in a transaction with lock key
`7210`, reads/writes on `tx`. Do **not** change the `findMany` filter — keep it
counting all rows (the semantic bug is explicitly out of scope). Target:

```ts
export async function startRound() {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7210)`)

    const activeRounds = await tx.query.bius.findMany({ columns: { id: true } })

    invariant(
      activeRounds.length < MAX_ACTIVE_ROUNDS,
      `Maximum of ${MAX_ACTIVE_ROUNDS} active rounds reached`,
    )

    const [round] = await tx.insert(bius).values({}).returning()
    return { round }
  })
}
```

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -c "pg_advisory_xact_lock(7210)" apps/web/src/lib/games/bius/ops.server.ts` → 1.

### Step 4: Concurrency regression test

In `apps/web/src/lib/games/sius/sius.integration.test.ts`, add a test modeled on
the existing `"...serializes concurrent attempts..."` case: fire N concurrent
`startSiuRound()` calls from an empty/low state with `Promise.allSettled`, then
assert the number of `status="active"` rounds never exceeds `MAX_ACTIVE_ROUNDS`
(3). The existing test shows how concurrency is exercised against the real DB in
this suite — copy its structure (setup, `Promise.all`/`allSettled`, count query,
teardown).

**Verify**: `cd apps/web && bun run test:integration` → all pass including the new case.

## Test plan

- New integration case in `sius.integration.test.ts`: concurrent `startSiuRound`
  never produces >3 active rounds (regression for the race).
- Verification: `cd apps/web && bun run test:integration` passes.
- If the integration harness cannot start locally, run typecheck + the grep
  done-criteria and note in the report that integration was not run.

## Done criteria

ALL must hold:

- [ ] `bun run --filter web typecheck` exits 0
- [ ] `bun run lint` exits 0 and `bunx oxfmt --check` exits 0
- [ ] `grep -c "pg_advisory_xact_lock(7110)" apps/web/src/lib/games/sius/ops.server.ts` → 2
- [ ] `grep -c "pg_advisory_xact_lock(7210)" apps/web/src/lib/games/bius/ops.server.ts` → 1
- [ ] `cd apps/web && bun run test:integration` passes incl. the new concurrency
      case (or integration explicitly noted as not run)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The functions don't match the "Current state" excerpts (drift).
- `pg_advisory_xact_lock` single-arg form errors at the DB (it shouldn't — it's
  standard Postgres; if it does, report the exact error).
- You find another caller that inserts into `sius`/`bius` rounds outside these
  functions (it would bypass the lock) — report it; do not refactor it here.
- Any verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Lock keys in use: `7101`/`7201` (per-round set creation, existing),
  `7110`/`7210` (per-game round creation, added here). Keep a comment or registry
  if more advisory locks are added, to avoid key collisions.
- **Deferred (needs a product decision + migration):** BIU `startRound` counts
  _all_ `bius` rows because the `bius` table has no `status` column and BIU
  chains are never archived — so BIU permanently caps at 3 chains total once
  three exist. SIU/RIU solved this with a `status` enum + archiving + auto
  top-up (see recent commits `4822b15`, `127860b`). Bringing BIU to parity is a
  separate feature plan: add `biu_status` enum + `status` column, archiving ops,
  and the matching browse UI. Flag this to the maintainer.
- Reviewer should scrutinize: that every read/write inside each function uses
  `tx`, not `db` (a stray `db` call escapes the transaction and the lock).
