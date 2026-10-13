# Home page

The home page (`src/routes/index.tsx`) is a mosaic: one slot per section of the app, and every slot is always filled.

## What it shows

| Slot  | Shows                                                        | Links to                |
| ----- | ------------------------------------------------------------ | ----------------------- |
| lead  | the newest rider video across the three games and the tricks | that set, answer, trick |
| games | the top three riders of the active rack it up round          | `/games/rius`           |
| rider | the newest rider                                             | their profile           |
| post  | the newest post                                              | that post               |
| chat  | the last chat line                                           | `/chat`                 |
| trick | the newest trick                                             | that trick              |
| vault | a vault clip, a different one each day                       | that clip               |

A signed-out visitor sees the same slots as a member and nothing more. Below `md` the page shows the logo itself, because the sidebar that carries it is hidden.

## No clocks, no counts

The page never renders a time, a date, a count, an online number or a "new" badge with a number in it. A small community should not look small. Keep it that way when adding to this page.

## Stale slots swap for the archive

A slot shows its newest item while that item is fresh, meaning younger than one week (`STALE_AFTER_MS`). After that the slot is filled from the archive, so a quiet week looks the same as a busy one:

| Slot  | Fresh                         | Stale                               |
| ----- | ----------------------------- | ----------------------------------- |
| lead  | the newest rider video        | a vault clip                        |
| rider | the newest rider, "new rider" | a rider from the roster, "rider"    |
| trick | the newest trick, "new trick" | a trick from the catalogue, "trick" |
| chat  | the last chat line            | a way into the arcade               |

Archive picks turn over once a day and are the same for everyone. The post slot always shows the newest post, and the games slot always shows the active round.

A slot with nothing at all behind it (an empty section, or no active round between rotations) becomes a plain link to its section. With no video and no vault clip, the lead slot shows the logo.

## What never appears

- Sets from the upcoming rack it up round. They are private until the round starts.
- Deleted back it up and stack it up sets.
- Trick videos that are not approved.
- Videos Mux has not finished processing.

## Key files

| File                                    | Purpose                                             |
| --------------------------------------- | --------------------------------------------------- |
| `src/lib/home/slots.ts`                 | The slot rules, free of dependencies                |
| `src/lib/home/ops.server.ts`            | The queries, one item per slot, cached for a minute |
| `src/lib/home/index.ts`                 | Facade with `queryOptions`                          |
| `src/components/home/home-mosaic.tsx`   | The tiles                                           |
| `src/lib/home/slots.unit.test.ts`       | Tests for the swap rules                            |
| `src/lib/home/home.integration.test.ts` | Tests against a real database                       |

The server result carries no timestamps: `ops.server.ts` reads them to apply the slot rules and then drops them, so the page has nothing it could render as an age.
