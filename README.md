<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/icons/logo-full-white.svg">
    <source media="(prefers-color-scheme: light)" srcset="apps/web/public/icons/logo-full-black.svg">
    <img src="apps/web/public/icons/logo-full-black.svg" width="260" alt="une.haus">
  </picture>
</p>

<p align="center">all things une</p>

<p align="center">
  <a href="https://une.haus">une.haus</a>
</p>

### about

une.haus is a platform for unicyclists to share tricks, compete in games, organize tournaments, and connect with each other.

**core features**

- **tricks** — browse a comprehensive trick encyclopedia with detail pages showing full trick info, videos, and prerequisites
- **games** — three collaborative games: _rack it up_ (post creative sets weekly and reply to others), _back it up_ (match the last trick then set a new one, building evolving chains), and _stack it up_ (nail every trick in the stack then add your own to the end)
- **vault** — explore unicycle.tv videos with community metadata curation, rider attribution, and filtering by discipline
- **posts** — share stories in posts with tags (freestyle, street, trials, etc.), leave comments, and like content
- **tourneys** — create and manage bracket-style tournaments with live tournament features
- **social** — find riders around the world on the map, follow other players, and stay connected

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

| command                    | description                        |
| -------------------------- | ---------------------------------- |
| `bun dev`                  | start dev server                   |
| `bun run build`            | build for production               |
| `bun start`                | run production server              |
| `bun run lint`             | lint                               |
| `bun run format`           | format with oxfmt                  |
| `bun run check`            | lint with auto-fix and format      |
| `bun run typecheck`        | type check                         |
| `bun preflight`            | lint, format, typecheck, and test  |
| `bun run test:unit`        | run unit tests                     |
| `bun run test:integration` | run integration tests              |
| `bun run db:migrate`       | push database migrations           |
| `bun run db:seed`          | wipe, migrate, and seed database   |
| `bun run clean`            | find and fix unused code with knip |

### contributing

1. fork the repo
2. create a branch (`git checkout -b feature/my-feature`)
3. make your changes
4. run checks before committing

```sh
bun run preflight
```

5. commit and push
6. open a pull request

### license

[mit](LICENSE)
