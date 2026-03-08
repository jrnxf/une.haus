import process from "node:process"

const checks = [
  { label: "lint", cmd: ["bun", "run", "lint"] },
  { label: "format", cmd: ["oxfmt", "--check", "src"] },
  { label: "typecheck", cmd: ["bun", "run", "typecheck"] },
  { label: "test", cmd: ["bun", "run", "test"] },
  { label: "integration tests", cmd: ["bun", "run", "test:integration"] },
]

console.log()
const results = await Promise.all(
  checks.map(async ({ label, cmd }) => {
    const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" })
    const code = await proc.exited
    const pass = code === 0
    console.log(`  ${pass ? "✅" : "🚨"} ${label}`)
    return { label, pass }
  }),
)

console.log()

const failed = results.some((r) => !r.pass)
process.exit(failed ? 1 : 0)
