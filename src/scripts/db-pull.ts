import { $ } from "bun"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createInterface } from "node:readline/promises"

// Copies the live D1 database into the local D1 that `bun dev` uses.
//
//   bun run db:pull [--yes] [--from <dump.sql>]
//
// The remote is only ever exported (read-only). The local database is wiped and
// rebuilt from the dump, so anything in it is lost. `--from` skips the remote
// export and imports an existing dump instead (that file is never deleted).
// cwd is the repo root (this runs via `bun run db:pull`).

const DATABASE = "unehaus"
// where wrangler and the cloudflare vite plugin keep local D1 state
const LOCAL_D1_STATE = ".wrangler/state/v3/d1"

const args = process.argv.slice(2)
const yes = args.includes("--yes")
const fromIndex = args.indexOf("--from")
const from = fromIndex === -1 ? undefined : args[fromIndex + 1]

if (fromIndex !== -1 && !from) {
  console.error("--from needs a path to a .sql dump")
  process.exit(1)
}

if (!yes) {
  if (!process.stdin.isTTY) {
    console.error(
      "not a terminal: pass --yes to confirm overwriting local data",
    )
    process.exit(1)
  }
  console.log(
    `this replaces the local ${DATABASE} database (${LOCAL_D1_STATE}) with ${
      from ? from : "a copy of the live database, including real member data"
    }.`,
  )
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question("continue? [y/N] ")
  rl.close()
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log("aborted, local data untouched")
    process.exit(0)
  }
}

const isRow = (line: string) => line.startsWith("INSERT INTO ")

const tmp = mkdtempSync(join(tmpdir(), "unehaus-db-pull-"))
try {
  let dump = from
  if (!dump) {
    dump = join(tmp, "remote.sql")
    console.log(`exporting remote ${DATABASE} (read-only)...`)
    await $`bunx wrangler d1 export ${DATABASE} --remote --output ${dump}`
  }

  // the dump interleaves each table with its rows, so a child row can land
  // before its parent table exists. Wrangler escapes newlines inside values, so
  // every statement is one line: put the schema first and the rows after it.
  const lines = readFileSync(dump, "utf8").split("\n")
  const ordered = join(tmp, "ordered.sql")
  writeFileSync(
    ordered,
    [
      "PRAGMA defer_foreign_keys=TRUE;",
      ...lines.filter((l) => !isRow(l) && !l.startsWith("PRAGMA ")),
      ...lines.filter(isRow),
    ].join("\n"),
  )

  // only reset once the export succeeded, so a failed pull keeps local data
  console.log("resetting local database...")
  rmSync(LOCAL_D1_STATE, { recursive: true, force: true })

  console.log("importing into local database...")
  await $`bunx wrangler d1 execute ${DATABASE} --local --file ${ordered}`

  // the dump carries prod's applied migrations; apply any newer local ones
  await $`bunx wrangler d1 migrations apply ${DATABASE} --local`
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log("done: local database is now a copy of the source dump")
console.log(
  "note: it contains real member data, treat this machine accordingly",
)
