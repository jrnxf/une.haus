import process from "node:process"

const checks = [
  { label: "lint", cmd: ["oxlint"] },
  { label: "format", cmd: ["oxfmt", "--check"] },
  { label: "typecheck", cmd: ["bun", "run", "--filter", "*", "typecheck"] },
  { label: "unit tests", cmd: ["bun", "run", "--filter", "*", "test:unit"] },
  {
    label: "integration tests",
    cmd: ["bun", "run", "--filter", "*", "test:integration"],
  },
]

console.log("running preflight checks...")
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
