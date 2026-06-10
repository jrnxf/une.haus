import { $ } from "bun"
import { readdirSync, rmSync } from "node:fs"

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
