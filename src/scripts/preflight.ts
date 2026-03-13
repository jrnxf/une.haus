import process from "node:process"

const checks = [
  { label: "lint", cmd: ["bun", "run", "lint"] },
  { label: "format", cmd: ["oxfmt", "--check"] },
  { label: "typecheck", cmd: ["bun", "run", "typecheck"] },
  {
    label: "clean",
    cmd: ["bunx", "knip", "--include", "files,dependencies,exports,types"],
  },
  { label: "unit tests", cmd: ["bun", "run", "test:unit"] },
  { label: "integration tests", cmd: ["bun", "run", "test:integration"] },
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
