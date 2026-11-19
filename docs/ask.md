# ask

`/ask` lets a signed-in member ask questions about une.haus. Claude answers with the same read tools that `/mcp` serves (`src/mcp/tools/registry.ts`).

## How it works

1. The page (`src/routes/_authed/ask.tsx`) keeps the thread in React state. Nothing is saved. "New" clears it.
2. Each question POSTs the thread to `/api/ask` (`src/routes/api/ask.ts`) as plain text turns.
3. The route checks the session, the API key and a limit of 25 questions per member per day (`countHit("ask:<userId>")`). From the 20th question, the page shows how many are left.
4. `runAsk` (`src/lib/ask/run.server.ts`) runs the SDK tool runner on `claude-sonnet-5-5` with medium effort and at most 8 model turns.
5. The response streams newline-delimited JSON events (`AskEvent` in `src/lib/ask/schemas.ts`):
   - `step` when a tool starts, with plain words for the page and the raw call for the "used N tools" fold
   - `quota` with the questions left today, only from the 20th question
   - `turn` when a new model turn starts (text before a tool call is a preamble, so the page drops it)
   - `text` for answer text
   - `cards` for the first 24 une.haus pages the answer links to (posts, riu sets, vault videos, riders and tricks). Up to 4 posts, riu sets and videos show as cards under the answer. Every linked page also gets a hover preview on its link (the AI Elements inline citation pattern, on our `HoverCard`). On touch screens a tap follows the link. The image is the uploaded video, photo or YouTube thumbnail for a post, the chosen thumbnail time for a vault video, the first active video for a trick, and the avatar for a rider.
   - `error`, then `done`
6. The page draws the thread with shadcn AI Elements parts in `src/components/ui/`: `MessageScroller` for the thread, `Message` and `Bubble` for the turns, `Trace` for the steps and `InputGroup` for the question box. The last answer has a Retry button. It asks the same question again with the same history and replaces that answer. `shadcn/tailwind.css` (imported in `src/styles.css`) gives them the `shimmer` and `scroll-fade` utilities.

## Prompt rules

`src/lib/ask/prompt.ts` holds the system prompt. It tells the model to:

- look things up before it answers and never invent content
- link everything it names to its page on the site
- write short, lowercase answers with links, bold and lists only
- hide how quiet the site is (no zero counts)
- never offer emails

## Setup

`ANTHROPIC_API_KEY` is optional in `src/lib/env.ts`. Without it, `/api/ask` answers 503.

- Local dev: add `ANTHROPIC_API_KEY=...` to `.dev.vars` and restart the dev server.
- Workers: `bunx wrangler secret put ANTHROPIC_API_KEY`.

## Cost

Sonnet 5.5 costs $2 per million input tokens and $10 per million output tokens, and $0.10 per million for cache reads. Thinking counts as output. The tools and the system prompt are cached, and so is the thread as each tool turn adds to it. Each question logs its token totals as `ask usage`. Measured on 19 Nov 2026 on the 4 suggestions: $0.006 to $0.013 per question, about $0.01 on average. At the limit of 25, one member costs at most about $0.30 a day. Check `ask usage` again before you raise the limit or change the model.
