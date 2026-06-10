# Plan 007: Add a CI/preflight guardrail that fails on ungenerated schema changes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. Touch
> only the files listed as in scope. If any STOP condition occurs, stop and
> report — do not improvise. Do NOT update `plans/README.md` (the reviewer owns
> the index).

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 006 (versioned migrations must exist first)
- **Category**: DX / safety
- **Planned at**: commit `76d99f7`

## Why this matters

Plan 006 switched prod to `drizzle-kit migrate`: deploys apply only committed
migration files, never a live-schema diff. The new failure mode is the inverse of
the old one — if someone edits `apps/web/src/db/schema.ts` but forgets to run
`drizzle-kit generate` and commit the resulting migration, the deploy **silently
does not apply the change** (migrate only runs committed files). Safe, but a
silent drift. This adds a cheap guardrail: a check that runs `drizzle-kit
generate` and fails if it would produce a new migration (i.e. the committed
schema is ahead of the committed migrations). It wires into both `bun preflight`
and CI.

## Current state

- `scripts/preflight.ts` — a `checks` array of `{ label, cmd: string[] }` spawned
  in parallel:
  ```ts
  const checks = [
    { label: "lint", cmd: ["oxlint"] },
    { label: "format", cmd: ["oxfmt", "--check"] },
    { label: "typecheck", cmd: ["bun", "run", "--filter", "*", "typecheck"] },
    { label: "clean", cmd: ["bun", "run", "--filter", "*", "clean:check"] },
    { label: "unit tests", cmd: ["bun", "run", "--filter", "*", "test:unit"] },
    {
      label: "integration tests",
      cmd: ["bun", "run", "--filter", "*", "test:integration"],
    },
  ]
  ```
- `.github/workflows/ci.yml` — runs each check as its own step (lint, format,
  typecheck, unit tests, integration tests). It does **not** call preflight, so
  the new check must be added here too. `DATABASE_URL` is already in the job `env`.
- `apps/web/package.json` db scripts (post-006):
  ```json
  "db:seed": "bun src/db/scripts/wipe.ts && bunx drizzle-kit migrate && bun src/db/scripts/seed.ts",
  "db:migrate": "bunx drizzle-kit migrate",
  "db:baseline": "bun src/db/scripts/baseline.ts",
  ```
- `apps/web/drizzle/` holds `0000_*.sql`, `0001_*.sql`, and `meta/` (`_journal.json`
  - per-migration snapshots). `apps/web/drizzle.config.ts` has `out: "./drizzle"`
    and **throws if `DATABASE_URL` is unset** (but `generate` never connects — a
    dummy value satisfies it).
- Repo convention: standalone scripts live in `apps/web/src/scripts/*.ts` and are
  run via `bun src/scripts/<name>.ts` from a `package.json` script (see
  `run-integration-tests.ts`, `reset-dev-db.ts`). Bun Shell (`import { $ } from
"bun"`) is available.

## Commands you will need

| Purpose           | Command                          | Expected                               |
| ----------------- | -------------------------------- | -------------------------------------- |
| Typecheck         | `bun run --filter web typecheck` | exit 0                                 |
| Run the new check | `bun run --filter web db:check`  | exit 0 (schema in sync on this commit) |
| Lint              | `bun run lint`                   | exit 0                                 |
| Format check      | `bunx oxfmt --check`             | exit 0                                 |

No database is required — `drizzle-kit generate` diffs `schema.ts` against the
committed migration snapshots and never connects.

## Scope

**In scope** (create/modify only these):

- `apps/web/src/scripts/check-schema-migrations.ts` (create) — the drift check.
- `apps/web/package.json` — add `db:generate` and `db:check` scripts.
- `scripts/preflight.ts` — add a `db schema` check to the `checks` array.
- `.github/workflows/ci.yml` — add a `db schema` step.

**Out of scope** (do NOT touch):

- `apps/web/src/db/schema.ts`, `apps/web/drizzle/**` (other than what the check
  temporarily generates and then cleans up at runtime), `drizzle.config.ts`.
- The other preflight checks / CI steps.

## Git workflow

- Branch: `advisor/007-schema-drift-check` (create/checkout in the worktree).
- Commit: `Add schema/migration drift check to preflight and ci`.
- Do NOT push or open a PR. No `Co-Authored-By` trailer.

## Steps

### Step 1: Write the drift-check script

Create `apps/web/src/scripts/check-schema-migrations.ts`. It snapshots the
migration files, runs `drizzle-kit generate`, and if any **new** file appeared the
schema is ahead of the migrations — it reverts the generated artifacts (so the
check is side-effect-free) and exits non-zero. Target:

```ts
import { readdirSync, rmSync } from "node:fs"

import { $ } from "bun"

// drizzle.config requires DATABASE_URL to exist; generate never connects, so a
// dummy value is fine when one isn't already set (local dev / CI both provide it).
process.env.DATABASE_URL ??= "postgres://dummy"

// cwd is apps/web (this runs via `bun run --filter web db:check`).
const snapshot = () =>
  new Set<string>([
    ...readdirSync("drizzle"),
    ...readdirSync("drizzle/meta").map((f) => `meta/${f}`),
  ])

const before = snapshot()
await $`bunx drizzle-kit generate`.nothrow().quiet()
const after = snapshot()

const created = [...after].filter((f) => !before.has(f))

if (created.length === 0) {
  console.log("✓ schema and migrations are in sync")
  process.exit(0)
}

// revert what generate produced so the check leaves the tree untouched
for (const f of created) rmSync(`drizzle/${f}`, { force: true })
await $`git checkout -- drizzle/meta/_journal.json`.nothrow().quiet()

console.error(
  "✗ schema.ts has changes not captured in a migration.\n" +
    "  run:  bun run --filter web db:generate\n" +
    "  then review the generated sql and commit it.",
)
process.exit(1)
```

If `$` / `.nothrow()` / `.quiet()` usage doesn't match how Bun Shell is used
elsewhere in the repo, match an existing call site. Do NOT remove the revert
block — the check must not leave stray migration files behind.

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 2: Add `db:generate` and `db:check` package scripts

In `apps/web/package.json`, alongside the other `db:` scripts, add:

```json
"db:generate": "bunx drizzle-kit generate",
"db:check": "bun src/scripts/check-schema-migrations.ts",
```

**Verify**: `grep -c '"db:check"' apps/web/package.json` → 1;
`grep -c '"db:generate"' apps/web/package.json` → 1;
`bun run --filter web db:check` → prints `✓ schema and migrations are in sync`,
exit 0; and `git status --porcelain apps/web/drizzle` → **empty** (no stray files
left behind).

### Step 3: Add the check to `scripts/preflight.ts`

Add one entry to the `checks` array (after `typecheck`, before `clean` is fine):

```ts
{ label: "db schema", cmd: ["bun", "run", "--filter", "web", "db:check"] },
```

Do not change anything else in the file.

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -c '"db schema"' scripts/preflight.ts` → 1.

### Step 4: Add the check to CI

In `.github/workflows/ci.yml`, add a step after the `typecheck` step:

```yaml
- name: db schema
  run: bun run --filter web db:check
```

Match the existing two-space step indentation. Do not touch other steps or `env`.

**Verify**: `grep -c 'db:check' .github/workflows/ci.yml` → 1.

### Step 5: Prove the check actually catches drift (negative test), then revert

Temporarily introduce a schema change and confirm the check fails and cleans up:

```bash
cd apps/web
# add a throwaway nullable column to an existing table
#   (edit src/db/schema.ts: add e.g. `note: text("note")` to the posts table)
bun run --filter web db:check   # expect: exit 1, the "✗ ... not captured" message
git status --porcelain drizzle  # expect: EMPTY (check reverted its own output)
git checkout -- src/db/schema.ts # revert the throwaway change
bun run --filter web db:check   # expect: exit 0 again
```

Report the exact exit codes you observed for the failing and passing runs.

**Verify**: failing run exits 1 with the drift message and leaves `drizzle/` clean;
after reverting, the check exits 0.

### Step 6: Lint & format

**Verify**: `bun run lint` → exit 0; `bunx oxfmt --check` → exit 0 (run
`bun run format` first if needed).

## Test plan

No DB needed. Verification is behavioral:

- Positive: `db:check` exits 0 on the unchanged tree (Step 2) and leaves no stray
  files.
- Negative: with a throwaway schema edit, `db:check` exits 1 and still leaves
  `drizzle/` clean (Step 5).

## Done criteria

ALL must hold:

- [ ] `bun run --filter web typecheck` exits 0
- [ ] `bun run lint` exits 0 and `bunx oxfmt --check` exits 0
- [ ] `bun run --filter web db:check` exits 0 on the unchanged tree and prints the
      in-sync message, leaving `git status --porcelain apps/web/drizzle` empty
- [ ] Negative test (Step 5) observed: check exits 1 on a throwaway schema edit,
      reverts its own generated files, and the edit is reverted afterward
- [ ] `grep -c '"db:check"' apps/web/package.json` → 1;
      `grep -c '"db:generate"' apps/web/package.json` → 1
- [ ] `grep -c '"db schema"' scripts/preflight.ts` → 1
- [ ] `grep -c 'db:check' .github/workflows/ci.yml` → 1
- [ ] No files outside the in-scope list are modified (`git status` clean except
      the in-scope files; `schema.ts` and `drizzle/**` unchanged vs HEAD)

## STOP conditions

Stop and report (do not improvise) if:

- `drizzle-kit generate` cannot run offline even with the dummy `DATABASE_URL`.
- `db:check` on the unchanged tree reports drift (exit 1) — that would mean the
  committed migrations and `schema.ts` are already out of sync at `76d99f7`;
  report what `generate` produced rather than "fixing" it.
- The negative test's `git checkout -- drizzle/meta/_journal.json` revert leaves
  `drizzle/` dirty.
- Any verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The check is `generate`-based, so it stays correct as the schema evolves — no
  hardcoded table/column list to maintain.
- It runs `git checkout -- drizzle/meta/_journal.json` to undo generate's
  in-place journal edit; if a developer ever has that file legitimately dirty
  while running the check locally, it would be restored — acceptable and rare.
- If drizzle-kit ever adds a true `--dry-run` to `generate`, the snapshot/revert
  dance can be replaced with it.
