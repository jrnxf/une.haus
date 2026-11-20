# home board

The home page (`/`, `src/routes/index.tsx`) is a board: an ask box, a game hero, the newest chat messages and posts, and links to tricks, vault and users.

## Data

One server function, `home.board` (`src/lib/home/`), returns everything the board shows: the hero, three chat messages and three posts. The read is small on purpose. It does not reuse the list queries of `/chat`, `/posts` or `/games`, which load much more.

The board shows no counts and no times. It must not show how quiet the site is.

## The hero

`getHomeHero` (`src/lib/home/ops.server.ts`) picks the first of these that has a ready video:

1. `riu` - the active rack it up round, when it has sets. The button says "play".
2. `biu` - the newest back it up trick that is still the last set of its chain, so a rider can back it up now.
3. `lastRiu` - the newest finished rack it up round that has sets. The button says "view".

Riders post sets while a round is upcoming. An active round with no sets stays empty all week, so step 2 and step 3 exist for that week.

When none of the three has a video, the hero is `null`. The board then has no big panel: chat and posts fill the row, and a games card joins the section cards. The hero is never an empty box.

## The ask box

A member's question starts a new ask thread and opens `/ask`. A guest goes to sign-in first. See `docs/ask.md`.
