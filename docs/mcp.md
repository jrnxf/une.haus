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

| tool       | what it does                                      |
| ---------- | ------------------------------------------------- |
| `ping`     | returns the message you send to it                |
| `get_user` | one rider's public profile and counts, by user id |

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
