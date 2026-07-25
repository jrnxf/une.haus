import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import process from "node:process"

// Converge une.haus infrastructure in the homelab. Code no longer ships from
// here — pushing to main does that via GitHub Actions (build on a GH-hosted
// runner, deploy via the self-hosted runner on the LXC; see DEPLOY.md). This
// wrapper runs the `unehaus` Ansible role for provisioning changes only:
// systemd units, /etc/unehaus/.env from vault, the deploy runner, cloudflared.

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
