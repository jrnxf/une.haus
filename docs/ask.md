# ask

The ask page (`/ask`) lets a signed-in member ask questions about une.haus. Claude answers with the same read tools that `/mcp` serves (`src/mcp/tools/registry.ts`). The home board (`/`) has an ask box too.

## How it works

1. `AskThreadProvider` (`src/components/ask/ask-thread-provider.tsx`) keeps the thread in React state above the routes. Pages read it with `useAskThread` (`src/lib/ask/thread-context.ts`). Nothing is saved: a reload clears it, and so does a change of the session user. "New" clears it.
   - The thread stays when the member opens another page and comes back to `/ask` (`src/routes/ask.tsx`).
   - A question from the home board (`src/routes/index.tsx`) starts a new thread and opens `/ask`, where the answer streams.
   - Guests see the same pages. When a guest asks, the page goes to `/auth` with `redirect=/ask?q=<question>`. After sign-in, the question waits in the box (`?q=`). No model call runs for a guest.
2. Each question POSTs the thread to `/api/ask` (`src/routes/api/ask.ts`) as plain text turns.
3. The route checks the session, the API key and the member's daily budget of $2 (`src/lib/ask/budget.server.ts`). At $2 or more it answers 429. User 1, the site owner, has no budget.
   - The spend is a fixed 24-hour window in `rate_limits` (`addToWindow` and `windowTotal` in `src/lib/auth/rate-limit.ts`, key `ask-spend:<userId>`), in millionths of a dollar. The window starts at the first question.
   - `runAsk` charges each model turn as soon as it ends, from the token usage in the stream events (`costMicrousd` in `src/lib/ask/cost.ts`). A turn cut short when the member leaves is still charged. `background()` keeps the write alive after the response ends.
   - When a turn takes the spend to $2 and the answer needs another turn, the question stops with the limit message. A question can go a little past $2, by at most one turn.
   - The page loads the share used with `ask.usage` (`src/lib/ask/fns.ts`) and draws it as a ring beside the ask button (`AskMeter`). The tooltip says how much is left. The ring turns red at 95%. At 100% the page disables the box and says to ask again tomorrow.
4. `runAsk` (`src/lib/ask/run.server.ts`) runs the SDK tool runner on `claude-sonnet-5-5` with medium effort and at most 8 model turns.
5. The response streams newline-delimited JSON events (`AskEvent` in `src/lib/ask/schemas.ts`):
   - `step` when a tool starts, with plain words for the page and the raw call for the "used N tools" fold
   - `quota` with the whole percent of today's budget used, when the question starts and after each model turn. The page writes it into the `ask.usage` query, so the ring moves while the answer streams
   - `turn` when a new model turn starts (text before a tool call is a preamble, so the page drops it)
   - `text` for answer text. After any tool result, the Anthropic API holds back the whole reply and sends every text delta in one burst (measured 0-5 ms apart on Sonnet 5.5 and Opus 5.5). A reply with no tool call streams normally. Our route and the worker pass chunks through as they come.
   - `cards` for the first 24 une.haus pages the answer links to (posts, riu sets, vault videos, riders and tricks). Up to 4 posts, riu sets and videos show as cards under the answer. Every linked page also gets a hover preview on its link (the AI Elements inline citation pattern, on our `HoverCard`). On touch screens a tap follows the link. The image is the uploaded video, photo or YouTube thumbnail for a post, the chosen thumbnail time for a vault video, the first active video for a trick, and the avatar for a rider.
   - `error`, then `done`
6. The page draws the thread with shadcn AI Elements parts in `src/components/ui/`: `MessageScroller` for the thread, `Message` and `Bubble` for the turns, and `Trace` for the steps. The question box is one line that grows with its text. The ring and a small submit button sit in its bottom right corner, and the text wraps around them: an empty inline block at the end of the text (`after:` on the editor) holds their space on the last line only. A textarea cannot wrap text around an element, so the box is a `contenteditable="plaintext-only"` div with `role="textbox"`. `shadcn/tailwind.css` (imported in `src/styles.css`) gives them the `shimmer` and `scroll-fade` utilities.
7. `usePacedText` (`src/lib/ask/hooks.ts`) paces the answer so the burst reads as a stream. It shows at least 0.4 characters per ms, and it speeds up so the text is all shown 600 ms after the last chunk. It reveals whole words only. With reduced motion, it shows all text at once. Cards wait until the pacing ends. While a model turn after a tool waits for its burst, the trace reads "thinking", because that turn can also call another tool.
8. `AskMarkdown` renders the answer with Streamdown (it replaced react-markdown). Streamdown closes partial markdown while text arrives, and fades in new words over 150 ms. We override its styled tags with plain ones so the `prose` styles apply. `src/styles.css` imports `streamdown/styles.css` and adds Streamdown's dist to Tailwind's `@source`.

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

Sonnet 5.5 costs $2 per million input tokens and $10 per million output tokens, and $0.10 per million for cache reads. Thinking counts as output. The tools and the system prompt are cached, and so is the thread as each tool turn adds to it. Each question logs its token totals as `ask usage`. Measured on 19 Nov 2026 on the 4 suggestions: $0.006 to $0.013 per question, about $0.01 on average. The $2 budget is about 200 questions a day. Prices live in `src/lib/ask/cost.ts`. Update them when the model or its price changes, and check `ask usage` again.
