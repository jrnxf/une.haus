import process from "node:process"

const parallelChecks = [
  { label: "lint", cmd: ["oxlint"] },
  { label: "format", cmd: ["oxfmt", "--check"] },
  { label: "typecheck", cmd: ["bun", "run", "--filter", "*", "typecheck"] },
  { label: "db schema", cmd: ["bun", "run", "--filter", "web", "db:check"] },
  {
    label: "clean",
    cmd: ["bun", "run", "--filter", "*", "clean:check"],
  },
  { label: "unit tests", cmd: ["bun", "run", "--filter", "*", "test:unit"] },
]

// Integration tests run against a dockerized postgres; running them while
// typecheck/knip/lint saturate the host starves the DB container and hangs
// random tests. Run them alone, after the parallel group.
const serialChecks = [
  {
    label: "integration tests",
    cmd: ["bun", "run", "--filter", "*", "test:integration"],
  },
]

async function runCheck({ label, cmd }: { label: string; cmd: string[] }) {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  const code = await proc.exited
  const pass = code === 0
  console.log(`  ${pass ? "✅" : "🚨"} ${label}`)
  return { label, pass, output: `${stdout}${stderr}`.trim() }
}

console.log("running preflight checks...")
const results = await Promise.all(parallelChecks.map(runCheck))
for (const check of serialChecks) {
  results.push(await runCheck(check))
}

const failures = results.filter((r) => !r.pass)
for (const f of failures) {
  console.log(`\n----- ${f.label} -----`)
  console.log(f.output || "(no output captured)")
}

process.exit(failures.length === 0 ? 0 : 1)
