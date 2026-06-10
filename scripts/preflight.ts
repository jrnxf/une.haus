import process from "node:process"

const checks = [
  { label: "lint", cmd: ["oxlint"] },
  { label: "format", cmd: ["oxfmt", "--check"] },
  { label: "typecheck", cmd: ["bun", "run", "--filter", "*", "typecheck"] },
  {
    label: "clean",
    cmd: ["bun", "run", "--filter", "*", "clean:check"],
  },
  { label: "unit tests", cmd: ["bun", "run", "--filter", "*", "test:unit"] },
  {
    label: "integration tests",
    cmd: ["bun", "run", "--filter", "*", "test:integration"],
  },
]

console.log("running preflight checks...")
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
