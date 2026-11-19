# ask

`/ask` lets a signed-in member ask questions about une.haus. Claude answers with the same read tools that `/mcp` serves (`src/mcp/tools/registry.ts`).

## How it works

1. The page (`src/routes/_authed/ask.tsx`) keeps the thread in React state. Nothing is saved. "New" clears it.
2. Each question POSTs the thread to `/api/ask` (`src/routes/api/ask.ts`) as plain text turns.
3. The route checks the session, the API key and a limit of 20 questions per member per day (`rateLimit("ask:<userId>")`).
4. `runAsk` (`src/lib/ask/run.server.ts`) runs the SDK tool runner on `claude-opus-5-5` with medium effort and at most 8 model turns.
5. The response streams newline-delimited JSON events (`AskEvent` in `src/lib/ask/schemas.ts`):
   - `step` when a tool starts, with plain words for the page and the raw call for the "used N tools" fold
   - `turn` when a new model turn starts (text before a tool call is a preamble, so the page drops it)
   - `text` for answer text
   - `cards` for up to 4 posts, riu sets and vault videos that the answer links to
   - `error`, then `done`

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

Opus 5.5 costs $4 per million input tokens and $20 per million output tokens. Thinking counts as output. Check the `usage` of a real question before you raise the daily limit.
