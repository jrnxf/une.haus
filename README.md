<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/icons/wordmark-white.svg">
    <source media="(prefers-color-scheme: light)" srcset="public/icons/wordmark-black.svg">
    <img src="public/icons/wordmark-black.svg" width="260" alt="une.haus">
  </picture>
</p>

<p align="center">a home for the unicycling community</p>

<p align="center">
  <a href="https://une.haus">une.haus</a>
</p>

<p align="center">
  <a href="https://github.com/jrnxf/une.haus/actions/workflows/ci.yml">
    <img src="https://github.com/jrnxf/une.haus/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-default.svg" alt="License">
  </a>
</p>

---

### about

une.haus is a platform for unicyclists to share tricks, compete in games, organize tournaments, and connect with each other.

- **tricks** — browse, submit, and review tricks with video proof
- **games** — play community games like bius, rius, and sius
- **vault** — archive and share unicycling videos
- **tourneys** — organize and compete in bracket-style tournaments
- **map** — find riders around the world

### tech stack

- [tanstack start](https://tanstack.com/start) — react 19 ssr framework
- [drizzle](https://orm.drizzle.team) — typescript orm for postgresql
- [tailwind css](https://tailwindcss.com) v4
- [tanstack router](https://tanstack.com/router) + [tanstack query](https://tanstack.com/query)
- [mux](https://mux.com) — video processing
- [maplibre](https://maplibre.org) — maps
- [bun](https://bun.sh) — package manager + runtime

### getting started

```sh
bun install
cp .env.example .env
bun dev
```

### scripts

| command                | description                      |
| ---------------------- | -------------------------------- |
| `bun dev`              | start dev server                 |
| `bun run build`        | build for production             |
| `bun start`            | run production server            |
| `bun run lint`         | lint and auto-fix                |
| `bun run format`       | format with prettier             |
| `bun run typecheck`    | type check                       |
| `bun test`             | run unit tests                   |
| `bunx playwright test` | run e2e tests                    |
| `bun run db:migrate`   | push database migrations         |
| `bun run db:seed`      | wipe, migrate, and seed database |

### contributing

1. fork the repo
2. create a branch (`git checkout -b feature/my-feature`)
3. make your changes
4. run checks before committing

```sh
bun run format
bun run lint
bun run typecheck
bun test
```

5. commit and push
6. open a pull request

### license

[mit](LICENSE)
