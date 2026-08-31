import { Glob } from "bun"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

process.chdir(resolve(import.meta.dirname, "../.."))

// Ephemeral sqlite database per run — the local stand-in for D1 (libsql
// driver, same async + batch() semantics). The recognizable path segment is
// what src/testing/integration.ts checks before truncating anything.
const dbDir = mkdtempSync(join(tmpdir(), "unehaus-integration-test-"))
const dbPath = join(dbDir, "unehaus-integration-test.sqlite")

process.on("exit", () => {
  rmSync(dbDir, { recursive: true, force: true })
})

const testEnv = {
  ...process.env,
  DATABASE_URL: `file:${dbPath}`,
  INTEGRATION_TEST_DB: "true",
}

async function runStreaming(cmd: string[], runEnv: Record<string, unknown>) {
  const proc = Bun.spawn(cmd, {
    cwd: process.cwd(),
    env: runEnv as Record<string, string>,
    stdout: "inherit",
    stderr: "inherit",
  })

  return await proc.exited
}

// Bootstrap schema
console.log(`Bootstrapping schema on ${testEnv.DATABASE_URL}`)
const bootstrapExitCode = await runStreaming(
  ["bunx", "drizzle-kit", "push", "--config=drizzle.config.ts", "--force"],
  testEnv,
)
if (bootstrapExitCode !== 0) {
  process.exit(bootstrapExitCode)
}

// Run tests
console.log("Running integration tests")
const args = process.argv.slice(2)
const testTarget =
  args.length > 0
    ? args
    : Array.from(new Glob("**/*.integration.test.ts").scanSync("./src"))
        .toSorted()
        .map((f) => `./src/${f}`)

// 30s per-test budget: the 5s default flakes under preflight's parallel load
// (typecheck + knip + unit + integration all compete for the machine).
const testExitCode = await runStreaming(
  ["bun", "test", "--timeout", "30000", ...testTarget],
  testEnv,
)
process.exit(testExitCode)
