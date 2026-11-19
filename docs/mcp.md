# mcp server

`src/mcp/server.ts` is a local [Model Context Protocol](https://modelcontextprotocol.io) server for une.haus. It uses the v2 TypeScript SDK (`@modelcontextprotocol/server`).

## run it

```sh
bun run mcp          # start it on stdio (a client normally does this)
bun run mcp:inspect  # open it in the MCP Inspector web UI
```

## how it works

- **Transport: stdio.** The client starts the server as a child process. Messages are JSON-RPC 2.0, one per line, on stdin and stdout. Logs must go to stderr, because any other text on stdout breaks the protocol.
- **Handshake.** The client sends `initialize` with the protocol versions it supports. The server answers with its version, its name and its capabilities (for example `tools`). The client then sends `notifications/initialized`.
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
