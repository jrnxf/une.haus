# mcp server

`src/mcp/server.ts` is a local [Model Context Protocol](https://modelcontextprotocol.io) server for une.haus. It uses the v2 TypeScript SDK (`@modelcontextprotocol/server`).

## run it

```sh
bun run mcp          # start it on stdio (a client normally does this)
bun run mcp:inspect  # open it in the MCP Inspector web UI
```

## use it from Claude Code

`.mcp.json` at the repo root registers the server for this project. The first time you start `claude` in the repo, it asks you to approve the server. After that:

- `/mcp` shows the server status and its tools.
- Ask a question such as "where is une.haus user 1 based?", and Claude calls `get_user` on its own.

Claude Code starts the server from the repo root, so bun finds `.env` there.

## how it works

- **Transport: stdio.** The client starts the server as a child process. Messages are JSON-RPC 2.0, one per line, on stdin and stdout. Logs must go to stderr, because any other text on stdout breaks the protocol.
- **Handshake.** The client sends `initialize` with the protocol versions it supports. The server answers with its version, its name and its capabilities (for example `tools`). The client then sends `notifications/initialized`.
- **Three primitives.** A server offers tools (the model calls them), resources (the client reads them, like files) and prompts (the user picks them, like slash commands).
- **Tools.** `tools/list` returns each tool's name, description and JSON Schema for its input and output. The SDK makes the JSON Schema from the zod schema. `tools/call` runs a tool and returns `content` (text for the model) and `structuredContent` (the same data, typed).

## prod data

The tools read the live D1 database over the Cloudflare REST API (`src/mcp/d1.ts`). The Worker binding exists only inside workerd, so a local process cannot use it.

Add two values to `.env`. Bun loads that file on its own.

```
CLOUDFLARE_ACCOUNT_ID=<from `bunx wrangler whoami`>
CLOUDFLARE_D1_TOKEN=<API token with Account > D1 > Read>
```

Two locks keep it read-only:

1. **The token.** It has only the D1 Read permission.
2. **`src/mcp/sql-guard.ts`.** It refuses anything but one `SELECT`, and it blocks tables with secrets or private state (`auth_codes`, `presence`, notifications and others). No tool returns `users.email`.

## tools

| tool               | what it does                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| `get_user`         | one rider's public profile and counts, by user id                        |
| `search_users`     | riders by name                                                           |
| `list_posts`       | posts newest first, by words or author, with a `before` cursor           |
| `get_post`         | one post with its full text, video link, likes and latest comments       |
| `get_riu_round`    | a RIU round (active, last or an id) with its sets                        |
| `get_riu_set`      | one RIU set with every submission and its video link                     |
| `list_submissions` | one rider's RIU submissions newest first, with a `before` cursor         |
| `list_rounds`      | RIU, BIU or SIU rounds newest first, with set count and newest set       |
| `get_chain_round`  | one BIU or SIU chain in position order, with likes and comments          |
| `get_chain_set`    | one BIU or SIU set, its parent and child, instructions and comments      |
| `get_trick`        | one trick with its links to other tricks (both ways) and approved videos |
| `recent_activity`  | posts, RIU, BIU and SIU sets, submissions and trick videos since a time  |
| `get_stats`        | site totals and the top 10 riders by content count                       |
| `search_tricks`    | the trick glossary by name or alternate name                             |
| `search_videos`    | the vault by title or rider name                                         |
| `get_video`        | one vault video with its riders in order, likes and latest comments      |
| `query`            | one read-only SELECT, at most 200 rows, for questions no tool fits       |

### where a tool lives

Each tool is one `defineTool({ name, title, description, inputSchema, outputSchema, run })` in `src/mcp/tools/`. `run(db, input)` takes the database as an argument and knows nothing about MCP:

- `src/mcp/tools/registry.ts` lists the shared read tools.
- `src/mcp/register.ts` wraps each one as an MCP tool. A `ToolError` becomes an `isError` result.
- The local server passes `prodDb` (D1 over REST). The Worker (`src/mcp/worker.ts`) passes its per-request D1 binding.
- `query` is on the local server only. It needs the read-only REST path, because the D1 binding can write.

To add a tool: write it with `defineTool`, add it to `readTools`, and add a case to `src/mcp/tools/tools.integration.test.ts`.

### tool design rules

- A list tool returns ids and short excerpts. A detail tool returns the full record.
- Every list tool takes `limit` (default 10, at most 50).
- A wrong id throws `ToolError`, which comes back as an `isError` result, so the model can try again.
- Video links are public Mux HLS URLs (`https://stream.mux.com/<id>.m3u8`).
- No tool returns `users.email`. The SQL guard refuses the column, and `query` drops it from `SELECT *`.
- An upcoming RIU round's roster is private until the round starts. `get_riu_round` and `get_riu_set` return a `ToolError` for it, `list_rounds` leaves the round out, and no other tool lists its sets. A tool does not know who calls it, so there is no exception for the setter or an admin.
- A soft-deleted BIU or SIU set (`deleted_at` set) never appears.
- D1 rejects a compound SELECT with more than 5 UNION terms. `recent_activity` and `get_stats` run one query per source and merge the rows in code.

## resources

| uri                | what                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `unehaus://schema` | one line per readable table, with column names and SQLite types. Private tables and `users.email` are left out. |

In Claude Code, type `@` and pick the resource to attach it to your message.

## prompts

| name        | args                         | what                                                                                |
| ----------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| `riu_recap` | `round`: `last` or `current` | loads a RIU round with its sets and landings, then asks for a short lowercase recap |

In Claude Code, run `/mcp__unehaus__riu_recap last`.

## the Worker endpoint

`src/mcp/worker.ts` serves the shared tools over HTTP at `/mcp`, with `createMcpHandler` from the SDK. It is stateless: each request gets a fresh `McpServer`, so any Worker instance can answer.

`/mcp` needs an OAuth token. `src/mcp/oauth.ts` puts `@cloudflare/workers-oauth-provider` in front of the whole Worker: it serves `/mcp`, the OAuth metadata, `/oauth/token` and `/oauth/register`, and hands every other request to the app.

- **Who can connect:** any signed-in member. The token carries `{ userId }` as `ctx.props`.
- **Consent:** `/oauth/authorize` (`src/routes/oauth/authorize.ts`) is a server route. With no session it sends the member to `/auth` and back. With a session it shows the consent page from `src/mcp/consent-page.ts`.
- **Clients:** dynamic registration and client metadata documents (CIMD) both work. CIMD needs the `global_fetch_strictly_public` flag in `wrangler.jsonc`.
- **Storage:** grants, tokens and clients live in the `OAUTH_KV` namespace.
- **Origins:** each origin (une.haus, a workers.dev preview, localhost) is its own resource, so a preview token never works on production.

Try the whole flow locally with the Inspector. It opens the consent page in your browser:

```sh
bunx @modelcontextprotocol/inspector@2.16.0 http://localhost:5173/mcp --transport http
```
