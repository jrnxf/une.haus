import { $, Glob } from "bun"
import { resolve } from "node:path"

process.chdir(resolve(import.meta.dirname, "../.."))

const containerName = `unehaus-integration-tests-${process.pid}`

async function waitForPostgresReady(container: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const result =
      await $`docker exec ${container} pg_isready -U unehaus_test -d unehaus_test`
        .quiet()
        .nothrow()
    if (result.exitCode === 0) return
    await Bun.sleep(500)
  }

  const logs = await $`docker logs ${container}`.nothrow().text()
  throw new Error(
    `Postgres did not become ready within ${timeoutMs}ms.\n${logs}`,
  )
}

process.on("exit", () => {
  Bun.spawnSync(["docker", "rm", "-f", containerName], {
    stdout: "ignore",
    stderr: "ignore",
  })
})

// Start postgres container
await $`docker run -d --name ${containerName} -e POSTGRES_USER=unehaus_test -e POSTGRES_PASSWORD=unehaus_test -e POSTGRES_DB=unehaus_test -P postgres:16-alpine`.quiet()

// Wait for postgres to be ready
await waitForPostgresReady(containerName)

// Get mapped port
const portOutput = await $`docker port ${containerName} 5432/tcp`.quiet().text()
const port = portOutput.trim().split(":").pop()

if (!port) {
  console.error("Failed to determine mapped PostgreSQL port")
  process.exit(1)
}

const testEnv = {
  ...process.env,
  DATABASE_URL: `postgresql://unehaus_test:unehaus_test@127.0.0.1:${port}/unehaus_test`,
  DATABASE_HOST: "127.0.0.1",
  DATABASE_NAME: "unehaus_test",
  DATABASE_USER: "unehaus_test",
  DATABASE_PASSWORD: "unehaus_test",
  INTEGRATION_TEST_DOCKER: "true",
}

async function runStreaming(cmd: string[], runEnv) {
  const proc = Bun.spawn(cmd, {
    cwd: process.cwd(),
    env: runEnv,
    stdout: "inherit",
    stderr: "inherit",
  })

  return await proc.exited
}

// Bootstrap schema using generate + migrate to avoid drizzle-kit push enum bugs
console.log(`Bootstrapping schema on ${testEnv.DATABASE_URL}`)

// Use generate to create SQL, then prepend enum CREATE TYPE statements and
// execute directly. drizzle-kit 0.31.x has a bug where it omits enum creation.
const tmpMigrationDir = `./src/db/test-migrations-${process.pid}`
const { readFileSync, writeFileSync, rmSync, readdirSync } =
  await import("node:fs")

const generateExitCode = await runStreaming(
  [
    "bunx",
    "drizzle-kit",
    "generate",
    "--dialect=postgresql",
    "--schema=./src/db/schema.ts",
    `--out=${tmpMigrationDir}`,
  ],
  testEnv,
)
if (generateExitCode !== 0) {
  rmSync(tmpMigrationDir, { recursive: true, force: true })
  process.exit(generateExitCode)
}

// Find the generated SQL file and prepend enum definitions
const sqlFile = readdirSync(tmpMigrationDir).find((f) => f.endsWith(".sql"))
if (!sqlFile) {
  console.error("No SQL migration file generated")
  rmSync(tmpMigrationDir, { recursive: true, force: true })
  process.exit(1)
}

const generatedSql = readFileSync(`${tmpMigrationDir}/${sqlFile}`, "utf-8")

// Extract enum definitions from the schema source. The pgEnum calls may span
// multiple lines, so we use a multiline-aware regex.
const schemaSource = readFileSync("./src/db/schema.ts", "utf-8")
const enumStatements: string[] = []

// Collect all const arrays (single and multi-line)
const constArrays: Record<string, string[]> = {}
const constRegex =
  /(?:export\s+)?const\s+(\w+)\s*=\s*\[([\s\S]*?)\]\s*as\s*const/g
for (const match of schemaSource.matchAll(constRegex)) {
  const values = match[2]
    .split(",")
    .map((v) => v.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
  constArrays[match[1]] = values
}

// Match pgEnum calls (single and multi-line)
const enumRegex = /pgEnum\(\s*"([^"]+)",\s*(\w+)\s*,?\s*\)/g
for (const match of schemaSource.matchAll(enumRegex)) {
  const enumName = match[1]
  const arrayName = match[2]
  const values = constArrays[arrayName]
  if (values) {
    const valuesList = values.map((v) => `'${v}'`).join(", ")
    enumStatements.push(`CREATE TYPE "${enumName}" AS ENUM (${valuesList});`)
  }
}

const fullSql = enumStatements.join("\n") + "\n" + generatedSql
const fullSqlPath = `${tmpMigrationDir}/full.sql`
writeFileSync(fullSqlPath, fullSql)

// Copy SQL into container and execute via psql
await $`docker cp ${fullSqlPath} ${containerName}:/tmp/schema.sql`.quiet()
const bootstrapExitCode = await runStreaming(
  [
    "docker",
    "exec",
    containerName,
    "psql",
    "-U",
    "unehaus_test",
    "-d",
    "unehaus_test",
    "-f",
    "/tmp/schema.sql",
  ],
  testEnv,
)

rmSync(tmpMigrationDir, { recursive: true, force: true })
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

const testExitCode = await runStreaming(["bun", "test", ...testTarget], testEnv)
process.exit(testExitCode)
