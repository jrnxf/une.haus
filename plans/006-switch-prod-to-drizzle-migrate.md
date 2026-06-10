# Plan 006: Switch prod DB migrations from `drizzle-kit push` to versioned `drizzle-kit migrate`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. Touch
> only the files listed as in scope. If any STOP condition occurs, stop and
> report — do not improvise. Do NOT update `plans/README.md` (the reviewer owns
> the index).

## Status

- **Priority**: P1 (prod deploys are currently failing at the migrate step)
- **Effort**: M
- **Risk**: MED (changes the deploy's DB-migration mechanism)
- **Depends on**: 003 (the index change whose deploy surfaced this)
- **Category**: bug / DX / infra
- **Planned at**: commit `a8b8df9`

## Why this matters

The prod deploy runs `bun run db:migrate`, which is wired to **`drizzle-kit push`**.
`push` re-diffs the _entire_ schema against the live DB on every run and emits
`DROP` statements to reconcile any drift. Against prod it just failed with
Postgres `2BP01` (`dependent_objects_still_exist`): it tried to drop/recreate a
`pgEnum` type whose column has a `.default()` (the schema has several:
`riu_status`, `siu_status`, `user_type`, `tourney_phase`, `trick_video_status`),
and Postgres refused because the column default depends on the type. It dies
there — **before ever creating plan 003's indexes** — so no migration applies and
every deploy's migrate step fails.

`push` is documented as a prototyping tool, not a production migration mechanism.
The fix is to switch prod to **versioned, reviewed SQL migrations**
(`drizzle-kit generate` → commit the SQL → `drizzle-kit migrate`). `migrate` only
runs the exact SQL in committed migration files — no full-schema diff, no surprise
drops. The first migration we ship contains **only** the 10 `CREATE INDEX`
statements from plan 003.

Because prod already has a populated schema, we **baseline** it: generate a
full-schema migration `0000` representing the current prod structure, mark it
applied on prod _without running it_, then `0001` (the indexes) applies on top.

## Current state

- `apps/web/drizzle.config.ts`:
  ```ts
  import { type Config } from "drizzle-kit"
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required")
  }
  export default {
    dbCredentials: { url: process.env.DATABASE_URL },
    dialect: "postgresql",
    out: "./src/db",
    schema: "./src/db/schema.ts",
  } satisfies Config
  ```
  Note: the config throws if `DATABASE_URL` is unset — so even `generate` (which
  does not connect) needs _some_ `DATABASE_URL` value in the env. A dummy value
  works for `generate` because it never opens a connection.
- `apps/web/package.json` db scripts:
  ```json
  "db:seed": "bun src/db/scripts/wipe.ts && bunx drizzle-kit push && bun src/db/scripts/seed.ts",
  "db:migrate": "bunx drizzle-kit push",
  ```
- `apps/web/src/db/meta/` holds a **stale, orphaned** drizzle baseline:
  `_journal.json` (single entry `0000_certain_network`, `when: 1739968145383`)
  and `0000_snapshot.json` from 2026-03-14 — but **no `.sql` file** for it. It
  predates the SIU-status work and plan 003. It must be discarded and regenerated;
  diffing against it would produce a migration full of unrelated enum/table churn.
- `apps/web/src/db/index.ts` exports the app's drizzle `db` client (used by the
  baseline script below). `sql` is from `drizzle-orm`.
- drizzle-orm `0.39.3`, drizzle-kit `0.31.8` (resolved). `readMigrationFiles` is
  exported from `drizzle-orm/migrator`; it returns
  `{ sql: string[], bps, folderMillis: <journal when>, hash: sha256(file) }[]`.
- The migrator records applied migrations in `drizzle.__drizzle_migrations`
  (`id serial primary key, hash text not null, created_at bigint`) and on each run
  applies every migration whose journal `when` is **greater than** the latest
  `created_at` in that table, inserting `(hash, created_at=when)`.

**Conventions to follow:**

- Scripts here are Bun + TS; the codebase uses `import { db } from "~/db"` and
  `import { sql } from "drizzle-orm"` for raw execution (`db.execute(sql\`...\`)`).
- Keep new script output lowercase/terse (repo copy convention).

## Commands you will need

| Purpose              | Command                                                                                | Expected                                            |
| -------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Typecheck            | `bun run --filter web typecheck`                                                       | exit 0                                              |
| Generate a migration | `cd apps/web && DATABASE_URL=postgres://dummy bunx drizzle-kit generate --name <name>` | writes `drizzle/<tag>.sql` + updates `drizzle/meta` |
| Lint                 | `bun run lint`                                                                         | exit 0                                              |
| Format check         | `bunx oxfmt --check`                                                                   | exit 0                                              |

Do **not** run `drizzle-kit push`, `drizzle-kit migrate`, or `db:baseline`
against any database — there is no DB in this worktree, and these are the
maintainer's deploy steps. `generate` is safe (it never connects; the dummy
`DATABASE_URL` only satisfies the config's existence check).

## Scope

**In scope** (modify/create only these):

- `apps/web/drizzle.config.ts` — change `out` to `"./drizzle"`.
- `apps/web/package.json` — `db:migrate` → `drizzle-kit migrate`; in `db:seed`
  replace `drizzle-kit push` with `drizzle-kit migrate`.
- `apps/web/drizzle/**` (create) — generated `0000_*.sql` (baseline),
  `0001_*.sql` (indexes), and `drizzle/meta/**`.
- `apps/web/src/db/scripts/baseline.ts` (create) — the one-time baseline marker.
- `apps/web/package.json` — add `"db:baseline"` script pointing at it.
- `apps/web/src/db/meta/**` — **delete** (stale orphaned baseline).
- `DEPLOY.md` — document the one-time baseline + the new migrate-based flow.

**Out of scope** (do NOT touch):

- `apps/web/src/db/schema.ts` — except the _temporary_ checkout in Step 2 to
  generate the baseline; it MUST end identical to commit `a8b8df9` (verify with
  `git diff --stat a8b8df9 -- apps/web/src/db/schema.ts` → empty).
- The ansible role in the homelab repo — it runs `bun run db:migrate`, which now
  resolves to `drizzle-kit migrate` automatically. No change needed there.
- `src/db/scripts/wipe.ts` / `seed.ts` references in `db:seed` (leave as-is; only
  swap the `push`→`migrate` word).
- Any enum reordering or schema "drift fix" — baselining makes prod's current
  enum state the accepted baseline; do not try to reconcile it.

## Git workflow

- Branch: `advisor/006-drizzle-migrate` (create/checkout in the worktree).
- Lowercase imperative commit, e.g. `Switch prod migrations from push to drizzle migrate`.
- Do NOT push or open a PR. No `Co-Authored-By` trailer.

## Steps

### Step 1: Point `out` at a dedicated migrations dir; delete the stale baseline

In `apps/web/drizzle.config.ts` change `out: "./src/db"` to `out: "./drizzle"`.
Delete the stale orphaned baseline: `rm -rf apps/web/src/db/meta`.

**Verify**: `bun run --filter web typecheck` → exit 0;
`test ! -e apps/web/src/db/meta && echo gone` → `gone`.

### Step 2: Generate the baseline migration `0000` from the **pre-index** schema

The baseline must represent prod's current structure, which is the schema
**without** plan 003's indexes (only commit `a30a55d` touched `schema.ts`; nothing
else since `04c705d` did). Temporarily check out the pre-index schema, generate,
then restore:

```bash
cd apps/web
# 1. swap in the pre-index schema (this is current schema minus the 10 indexes)
git checkout 04c705d -- src/db/schema.ts
# 2. generate the full-schema baseline
DATABASE_URL=postgres://dummy bunx drizzle-kit generate --name baseline
# 3. restore the current schema (with the indexes) exactly
git checkout a8b8df9 -- src/db/schema.ts
```

**Verify**:

- `ls apps/web/drizzle/*.sql` shows exactly one file (the `0000_*baseline*.sql`).
- `git diff --stat a8b8df9 -- apps/web/src/db/schema.ts` → **empty** (schema fully
  restored).
- The baseline `.sql` contains `CREATE TABLE`/`CREATE TYPE` statements (it's the
  full schema) — sanity only.
- If `drizzle-kit generate` errors that it can't find a DB or needs interaction,
  re-read the dummy-`DATABASE_URL` note. STOP if it cannot generate offline.

### Step 3: Generate `0001` containing **only** the indexes

With the current (index-bearing) schema now restored, generate the diff:

```bash
cd apps/web
DATABASE_URL=postgres://dummy bunx drizzle-kit generate --name add_engagement_indexes
```

**Verify (critical — this is the whole point of the plan):**

- A second file `apps/web/drizzle/0001_*add_engagement_indexes*.sql` exists.
- `grep -c 'CREATE INDEX' apps/web/drizzle/0001_*.sql` → **10**.
- `grep -ciE 'DROP|ALTER TYPE|CREATE TYPE|CREATE TABLE' apps/web/drizzle/0001_*.sql`
  → **0**. (If this is not 0, the baseline in Step 2 did not match the current
  schema-minus-indexes — STOP and report the offending statements; do not edit the
  SQL by hand.)
- The 10 index names match plan 003:
  `grep -oE '"[a-z_]+_idx"' apps/web/drizzle/0001_*.sql | sort -u` lists
  `posts_user_created_idx`, `post_messages_user_created_idx`,
  `riu_sets_user_created_idx`, `riu_sets_riu_id_idx`,
  `riu_submissions_user_created_idx`, `biu_sets_user_created_idx`,
  `biu_sets_biu_id_idx`, `siu_sets_user_created_idx`, `siu_sets_siu_id_idx`,
  `notifications_user_emailed_created_idx`.

### Step 4: Switch the npm scripts to `migrate`

In `apps/web/package.json`:

- `"db:migrate": "bunx drizzle-kit push"` → `"db:migrate": "bunx drizzle-kit migrate"`.
- In `"db:seed"`, replace `bunx drizzle-kit push` with `bunx drizzle-kit migrate`
  (leave the `wipe.ts` / `seed.ts` parts unchanged).
- Add `"db:baseline": "bun src/db/scripts/baseline.ts"`.

**Verify**: `grep -c 'drizzle-kit push' apps/web/package.json` → **0**;
`grep -c 'drizzle-kit migrate' apps/web/package.json` → **2**;
`grep -c 'db:baseline' apps/web/package.json` → **1**.

### Step 5: Write the one-time baseline marker script

Create `apps/web/src/db/scripts/baseline.ts`. It marks migration `0000` as applied
on the target DB **without running it**, so a subsequent `drizzle-kit migrate`
applies only `0001+`. It uses drizzle's own `readMigrationFiles` so the recorded
hash is exactly what the migrator expects. Target shape:

```ts
import { sql } from "drizzle-orm"
import { readMigrationFiles } from "drizzle-orm/migrator"

import { db } from "~/db"

// Marks ONLY the baseline migration (0000) as already-applied, so the existing
// prod schema is accepted as-is and `drizzle-kit migrate` applies 0001 onward.
// Idempotent: re-running it does nothing once the table has a row.
const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" })
const baseline = migrations[0]
if (!baseline) throw new Error("no migrations found in ./drizzle")

await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`)
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`)

const existing = await db.execute(
  sql`SELECT count(*)::int AS n FROM "drizzle"."__drizzle_migrations"`,
)
// drizzle's execute returns a result whose row shape depends on the driver;
// read the count defensively. If any migration is already recorded, do nothing.
const already = Number(
  (existing as unknown as { rows?: { n: number }[] }).rows?.[0]?.n ??
    (existing as unknown as { n: number }[])[0]?.n ??
    0,
)
if (already > 0) {
  console.log("baseline: migrations table already populated — nothing to do")
} else {
  await db.execute(
    sql`INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
        VALUES (${baseline.hash}, ${baseline.folderMillis})`,
  )
  console.log(`baseline: marked ${baseline.hash.slice(0, 12)}… as applied`)
}
process.exit(0)
```

If the exact result-row access for the count differs from how `db.execute`
returns rows elsewhere in this repo, match an existing `db.execute(sql\`select …\`)`
call site instead of guessing. Do NOT remove the "already populated" guard — it
keeps the script idempotent and safe to re-run.

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 6: Document the new flow in `DEPLOY.md`

Add a short subsection under the schema/env area of `DEPLOY.md` explaining:

- Prod migrations now use `drizzle-kit migrate` (versioned, reviewed SQL in
  `apps/web/drizzle/`), not `push`.
- **One-time baseline (must run once, before the next deploy):** on the box, as
  the unehaus user with the prod env loaded:
  `set -a; . /etc/unehaus/.env; set +a; cd /opt/unehaus && bun run --filter web db:baseline`
  — marks the existing prod schema as baseline `0000` so `migrate` does not try to
  recreate it.
- After that, every deploy runs `bun run db:migrate` (= `drizzle-kit migrate`),
  applying only new, reviewed migration files. To add future schema changes:
  edit `schema.ts`, run `bun run --filter web db:generate`-style
  `drizzle-kit generate`, **review the generated SQL**, commit it.

Keep it concise and lowercase-consistent with the file.

**Verify**: `bunx oxfmt --check` → exit 0 (run `bun run format` if needed);
`bun run lint` → exit 0.

## Test plan

No DB is available in the worktree, so the migrate/baseline paths cannot be
executed here (the maintainer runs them on the box). Verification is static:

- `0001_*.sql` contains exactly the 10 `CREATE INDEX` statements and nothing
  destructive (Step 3 greps).
- `schema.ts` is byte-identical to `a8b8df9` after the baseline dance (Step 2).
- Scripts swapped (Step 4 greps), typecheck/lint/format green.

Note explicitly in your report that `drizzle-kit migrate` and `db:baseline` were
NOT executed (no DB in worktree).

## Done criteria

ALL must hold:

- [ ] `bun run --filter web typecheck` exits 0
- [ ] `bun run lint` exits 0 and `bunx oxfmt --check` exits 0
- [ ] `apps/web/drizzle/` contains a `0000_*.sql` baseline and a
      `0001_*add_engagement_indexes*.sql`, plus `drizzle/meta/_journal.json`
- [ ] `grep -c 'CREATE INDEX' apps/web/drizzle/0001_*.sql` → 10
- [ ] `grep -ciE 'DROP|ALTER TYPE|CREATE TYPE|CREATE TABLE' apps/web/drizzle/0001_*.sql` → 0
- [ ] `grep -c 'drizzle-kit push' apps/web/package.json` → 0;
      `grep -c 'drizzle-kit migrate' apps/web/package.json` → 2
- [ ] `git diff --stat a8b8df9 -- apps/web/src/db/schema.ts` → empty
- [ ] `apps/web/src/db/meta` no longer exists
- [ ] `apps/web/src/db/scripts/baseline.ts` exists and typechecks
- [ ] `DEPLOY.md` documents the one-time baseline + migrate flow
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

Stop and report (do not improvise) if:

- `drizzle-kit generate` cannot run offline even with a dummy `DATABASE_URL`.
- `0001`'s SQL contains anything other than `CREATE INDEX` (means the baseline
  didn't match current-minus-indexes — report the diff; do NOT hand-edit the SQL).
- `git diff a8b8df9 -- apps/web/src/db/schema.ts` is non-empty after Step 2 (the
  schema was not restored cleanly).
- `db.execute` row-shape for the count guard can't be matched to an existing call
  site with confidence.
- Any verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **The one-time `db:baseline` on prod must happen before the next deploy.** If a
  deploy runs `drizzle-kit migrate` against prod _before_ baselining, migrate will
  try to apply `0000` (full schema) onto the existing DB and fail. Order:
  baseline once → then deploys.
- After baselining, `push` should never be used against prod again. Consider
  removing it from any dev muscle-memory; `db:seed` (fresh/wiped dev DB) now uses
  `migrate` too, so dev exercises the same path as prod.
- Future schema changes: `drizzle-kit generate`, **review the SQL diff** (this is
  the safety the switch buys — especially for enum changes, confirm it emits
  `ALTER TYPE ... ADD VALUE`, never `DROP TYPE`), commit, deploy.
- The pre-existing enum drift in prod (what `push` choked on) is now intentionally
  accepted as baseline. It is harmless to the running app; revisit only if a real
  enum _value_ change is needed, at which point the generated SQL is reviewed.
