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

// Bootstrap schema
console.log(`Bootstrapping schema on ${testEnv.DATABASE_URL}`)
const bootstrapExitCode = await runStreaming(
  ["bunx", "drizzle-kit", "push", "--config=drizzle.config.ts"],
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

const testExitCode = await runStreaming(["bun", "test", ...testTarget], testEnv)
process.exit(testExitCode)
