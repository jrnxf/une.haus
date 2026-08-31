import process from "node:process"

const parallelChecks = [
  { label: "lint", cmd: ["oxlint"] },
  { label: "format", cmd: ["oxfmt", "--check"] },
  { label: "typecheck", cmd: ["bun", "run", "typecheck"] },
  { label: "db schema", cmd: ["bun", "run", "db:check"] },
  {
    label: "clean",
    cmd: ["bun", "run", "clean:check"],
  },
  { label: "unit tests", cmd: ["bun", "run", "test:unit"] },
]

// Integration tests spawn their own worker pool over an ephemeral sqlite
// file; running them while typecheck/knip/lint saturate the host makes
// individual tests trip their timeouts. Run them alone, after the parallel
// group.
const serialChecks = [
  {
    label: "integration tests",
    cmd: ["bun", "run", "test:integration"],
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
