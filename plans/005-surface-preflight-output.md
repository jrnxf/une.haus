# Plan 005: Make `bun preflight` show why a check failed

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 127860b..HEAD -- scripts/preflight.ts`
> If `scripts/preflight.ts` changed since this plan was written, compare the
> "Current state" excerpt against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `127860b`, 2026-06-10

## Why this matters

`bun preflight` is the mandated pre-commit gate (CLAUDE.md: "Always run
`bun preflight` before committing"). It runs six checks in parallel but pipes
every check's stdout AND stderr to `"ignore"`, so a failure prints only
`🚨 typecheck` with **no error message**. The developer (or an executor agent)
then has to guess which of six commands to re-run by hand to see the actual
error. Capturing each check's output and printing it on failure turns preflight
into a usable signal instead of a "something's broken, go fishing" emoji.

## Current state

- `scripts/preflight.ts` — the whole script. The relevant lines:

  ```ts
  const results = await Promise.all(
    checks.map(async ({ label, cmd }) => {
      const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" })
      const code = await proc.exited
      const pass = code === 0
      console.log(`  ${pass ? "✅" : "🚨"} ${label}`)
      return { label, pass }
    }),
  )

  const success = results.every((r) => r.pass)
  process.exit(success ? 0 : 1)
  ```

- Runtime is Bun (`Bun.spawn` API). The six checks are: lint, format, typecheck,
  clean, unit tests, integration tests (see the `checks` array at the top).

**Conventions to follow:**

- This is a Bun script (top-level `await`, `Bun.spawn`). Keep using Bun APIs.
- Output style is lowercase, terse (matches the repo's lowercase-copy
  convention). Keep the emoji summary; add detail only for failures.

## Commands you will need

| Purpose                  | Command              | Expected on success   |
| ------------------------ | -------------------- | --------------------- |
| Run preflight (all pass) | `bun preflight`      | exits 0, six ✅ lines |
| Lint                     | `bun run lint`       | exit 0                |
| Format check             | `bunx oxfmt --check` | exit 0                |

## Scope

**In scope** (the only file you modify):

- `scripts/preflight.ts`

**Out of scope** (do NOT touch):

- The individual check commands or the `package.json` scripts they call.
- CI config (`.github/workflows/ci.yml`) — CI runs the checks separately and
  already shows their output.

## Git workflow

- Branch: `advisor/005-preflight-output`
- One commit: `Surface failing check output in preflight`.
- Do NOT push or open a PR unless instructed. No `Co-Authored-By` trailer.

## Steps

### Step 1: Capture output instead of discarding it

Change each spawned check to capture stdout/stderr (pipe), keep the parallel
emoji summary, then after the summary print the captured output for any check
that failed. Target shape:

```ts
const results = await Promise.all(
  checks.map(async ({ label, cmd }) => {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" })
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    const code = await proc.exited
    const pass = code === 0
    console.log(`  ${pass ? "✅" : "🚨"} ${label}`)
    return { label, pass, output: `${stdout}${stderr}`.trim() }
  }),
)

const failures = results.filter((r) => !r.pass)
for (const f of failures) {
  console.log(`\n----- ${f.label} -----`)
  console.log(f.output || "(no output captured)")
}

process.exit(failures.length === 0 ? 0 : 1)
```

Keep the existing `console.log("running preflight checks...")` line and the
`checks` array exactly as they are.

**Verify**: `grep -c '"ignore"' scripts/preflight.ts` → 0;
`grep -c '"pipe"' scripts/preflight.ts` → 2.

### Step 2: Confirm the happy path still works

**Verify**: `bun preflight` → exits 0 and prints six `✅` lines (assuming the
working tree is clean; if a check legitimately fails, that's the feature working
— confirm the failure section now prints that check's real output, then fix the
underlying issue or stash it so preflight is green before finishing).

### Step 3: Lint & format the script

**Verify**: `bun run lint` → exit 0; `bunx oxfmt --check` → exit 0 (run
`bun run format` first if it reports a diff on the file).

## Test plan

No automated test — this is a dev script. Verification is behavioral:

- Happy path: `bun preflight` exits 0 with six ✅ lines (Step 2).
- Failure path (manual sanity, optional): temporarily introduce a type error in
  any `apps/web/src` file, run `bun preflight`, confirm it prints the `typecheck`
  section with the real `tsgo` error, then revert the deliberate error. Do NOT
  commit the deliberate error.

## Done criteria

ALL must hold:

- [ ] `grep -c '"ignore"' scripts/preflight.ts` → 0
- [ ] `bun preflight` exits 0 on a clean tree with six ✅ lines
- [ ] `bun run lint` exits 0 and `bunx oxfmt --check` exits 0
- [ ] Only `scripts/preflight.ts` is modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `scripts/preflight.ts` doesn't match the "Current state" excerpt (drift).
- `bun preflight` fails on a check that is unrelated to this change (a
  pre-existing red check) — report which check and its now-visible output rather
  than trying to fix unrelated code.
- Any verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Output is buffered fully in memory then printed after the summary, so logs from
  parallel checks don't interleave. If a future check produces enormous output,
  consider truncating to the last N lines.
- Reviewer should scrutinize: that exit code is still non-zero on any failure
  (the gate must keep failing CI-equivalently), and that captured stderr is
  included (tsgo/oxlint write errors to stderr).
