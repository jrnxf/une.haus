import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import process from "node:process"

// Deploy une.haus to the homelab. Production is operated from the `homelab`
// repo as the `unehaus` Ansible role (native Bun + systemd) — see DEPLOY.md.
// This is a thin wrapper that runs that playbook so the deploy lives behind a
// `bun run deploy` here instead of remembering the ansible invocation.
//
// The role rsyncs THIS repo's working tree to the box (no git pull on the
// server), so whatever is checked out here is exactly what ships.

const repoRoot = resolve(dirname(import.meta.dir))

// Default to a sibling `homelab` checkout (~/Dev/une.haus + ~/Dev/homelab);
// override with HOMELAB_DIR for a different layout.
const homelabDir = process.env.HOMELAB_DIR
  ? resolve(process.env.HOMELAB_DIR)
  : resolve(repoRoot, "../homelab")
const ansibleDir = resolve(homelabDir, "ansible")
const playbook = "playbooks/deploy-infra.yml"

function fail(message: string): never {
  console.error(`deploy: ${message}`)
  process.exit(1)
}

if (!existsSync(resolve(ansibleDir, playbook))) {
  fail(
    `could not find ${playbook} under ${ansibleDir}.\n` +
      `set HOMELAB_DIR to your homelab repo checkout (currently "${homelabDir}").`,
  )
}

if (!Bun.which("ansible-playbook")) {
  fail("ansible-playbook is not installed or not on PATH.")
}

// Print the commit that will ship — the deploy rsyncs the working tree, so this
// is the actual release, dirty edits included. Best-effort; never blocks deploy.
const head = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], {
  cwd: repoRoot,
})
const dirty = Bun.spawnSync(["git", "status", "--porcelain"], { cwd: repoRoot })
if (head.success) {
  const commit = head.stdout.toString().trim()
  const isDirty = dirty.success && dirty.stdout.toString().trim().length > 0
  console.log(
    `deploying une.haus @ ${commit}${isDirty ? " (working tree has uncommitted changes)" : ""}`,
  )
}

// Forward any extra args (e.g. --check, -v, --limit) straight to ansible.
const passthrough = process.argv.slice(2)
const cmd = ["ansible-playbook", playbook, "--tags", "unehaus", ...passthrough]

console.log(`running: ${cmd.join(" ")}  (cwd: ${ansibleDir})`)

const proc = Bun.spawn(cmd, {
  cwd: ansibleDir,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

process.exit(await proc.exited)
