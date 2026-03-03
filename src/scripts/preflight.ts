const checks = [
  { label: "lint", cmd: ["bun", "run", "lint"] },
  { label: "format", cmd: ["oxfmt", "--check", "src"] },
  { label: "typecheck", cmd: ["bun", "run", "typecheck"] },
  { label: "test", cmd: ["bun", "run", "test"] },
]

const results = await Promise.all(
  checks.map(async ({ label, cmd }) => {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" })
    const code = await proc.exited
    return { label, pass: code === 0 }
  }),
)

console.log()
for (const { label, pass } of results) {
  console.log(`  ${pass ? "✅" : "🚨"} ${label}`)
}
console.log()

const failed = results.some((r) => !r.pass)
process.exit(failed ? 1 : 0)
