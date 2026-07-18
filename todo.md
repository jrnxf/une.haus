# todo: auto-deploy on push to main

Goal: pushing to `main` deploys to the homelab box automatically. Today deploy
is manual (`bun run deploy` → `unehaus` Ansible role rsyncs the _local working
tree_). Auto-deploy means git becomes the source of truth: the box builds from
`origin/main`, not from whatever is checked out on the laptop.

## Constraints that shape the choice

- Repo is **public** → a self-hosted GitHub Actions runner on the box is
  discouraged by GitHub (fork PRs can run arbitrary code on the runner).
  Mitigations exist (runner groups, approval gates) but it's the wrong risk
  for a homelab box holding prod secrets.
- Box is a homelab — likely no inbound exposure, so a GitHub webhook needs a
  tunnel (Cloudflare Tunnel / Tailscale Funnel) to reach it.
- CI already runs on push to `main` (`.github/workflows/ci.yml`) — the deploy
  should gate on it, mirroring the "run preflight before deploy" rule.

## Recommended: pull-based deploy agent on the box (systemd timer)

No inbound exposure, no GitHub-side secrets that can reach the box, works from
behind NAT, ~1 min latency. This is the standard homelab pattern when the repo
host can't be trusted to push into your network.

- [ ] In the `homelab` repo, extend the `unehaus` role with a deploy agent:
  - [ ] Maintain a bare-ish clone at e.g. `/opt/unehaus/src` (fetch-only
        deploy key or public clone — repo is public, so plain https works).
  - [ ] `unehaus-autodeploy.timer` (`OnUnitActiveSec=60s`) →
        `unehaus-autodeploy.service` running a script that:
    - [ ] `git ls-remote origin main` — exit early if SHA matches the
          currently deployed one (stamp file, e.g. `/opt/unehaus/.deployed-sha`).
    - [ ] Gate on CI green for that SHA:
          `gh api repos/jrnxf/une.haus/commits/<sha>/check-runs`
          (or the combined status endpoint). Skip if pending/failed.
    - [ ] `git fetch && git checkout <sha>`, then per DEPLOY.md:
          `bun install --frozen-lockfile`, `bun run build:web`,
          `bun run build:docs`, `bun run --filter web db:migrate`.
    - [ ] Build into a versioned dir + symlink swap (e.g.
          `/opt/unehaus/releases/<sha>` → `current`) so a failed build never
          takes down the running service.
    - [ ] `systemctl restart unehaus-web unehaus-docs`, health-check
          (curl localhost:3000 / :3001), write stamp file only on success.
    - [ ] Log to journald with `GIT_COMMIT` so Loki attribution keeps working.
  - [ ] Flock/`ExecStartPre` guard so overlapping runs can't race.
- [ ] Failure notification — timer `OnFailure=` unit that pings (email via
      Resend, ntfy, or similar). Silent broken auto-deploy is worse than manual.
- [ ] Keep `bun run deploy` working as the manual escape hatch (it should also
      update the stamp file, or the agent will immediately redeploy over it).
- [ ] Update DEPLOY.md: git is now the source of truth for prod; local
      working-tree rsync is fallback only.
- [ ] Rollback story: `git checkout <old-sha>` + rebuild, or flip the
      `current` symlink back. Document the one-liner.

## Alternatives considered

- **GitHub Actions (hosted runner) → push to box over Tailscale/SSH**: use
  `tailscale/github-action` with an ephemeral auth key, rsync the built
  `.output` dirs, restart units. Faster (no polling), build happens off-box,
  and CI gating is free (same workflow, `needs: ci`). Cost: GitHub holds
  credentials into the tailnet; workflow secrets on a public repo demand care.
  Solid choice if push-latency matters or the box is too weak to build.
- **Webhook receiver on the box** (adnanh/webhook or a tiny handler behind
  Cloudflare Tunnel, HMAC-verified): instant deploys, but adds an exposed
  endpoint + tunnel to maintain. The 60s poll makes this not worth it.
- **Self-hosted Actions runner on the box**: cleanest DX, but repo is public —
  ruled out per GitHub's own guidance unless the repo goes private.

## Open questions

- [ ] Should the box build, or should CI build and publish an artifact the box
      downloads? (Box build is simpler; artifact keeps prod load at zero
      during deploys and guarantees the tested bytes ship.)
- [ ] Does `db:migrate` need a maintenance-mode guard for long migrations?
