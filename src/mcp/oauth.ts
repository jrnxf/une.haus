import {
  OAuthProvider,
  type OAuthProviderOptions,
  getOAuthApi,
} from "@cloudflare/workers-oauth-provider"

import { runWithRequestDb } from "~/db"
import { MCP_PATH, mcpHandler } from "~/mcp/worker"

// What a token carries to /mcp. It is set when the member approves the
// client on the consent page, and the provider stores it encrypted.
export type McpProps = { userId: number }

const MCP_SCOPE = "mcp:read"
const AUTHORIZE_PATH = "/oauth/authorize"

// The Worker answers on une.haus, on workers.dev preview URLs and on
// localhost in dev. Each origin is its own OAuth resource, so a token from a
// preview never works on production.
function isKnownOrigin(url: URL) {
  if (url.origin === "https://une.haus") return true
  if (url.protocol === "https:" && url.hostname.endsWith(".workers.dev")) {
    return true
  }
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  )
}

// The Worker types stay structural on purpose (see src/server.ts), so the
// handlers take loose arguments and the provider gets the real objects.
type Handler = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>
}

const apiHandler: Handler = {
  fetch: async (request) => {
    const { result } = await runWithRequestDb(() => mcpHandler.fetch(request))
    return result
  },
}

function options(
  origin: string,
  defaultHandler: Handler,
): OAuthProviderOptions<unknown> {
  return {
    apiRoute: MCP_PATH,
    apiHandler,
    defaultHandler,
    authorizeEndpoint: AUTHORIZE_PATH,
    tokenEndpoint: "/oauth/token",
    clientRegistrationEndpoint: "/oauth/register",
    // claude.ai and Claude Code identify themselves with a metadata URL.
    clientIdMetadataDocumentEnabled: true,
    scopesSupported: [MCP_SCOPE],
    requiredScopes: [MCP_SCOPE],
    resourceMetadata: {
      resource: `${origin}${MCP_PATH}`,
      authorization_servers: [origin],
      resource_name: "une.haus",
    },
  }
}

// One provider per origin, built on first use. The app handler is the same
// for every origin, so it is passed once by the Worker entry.
const providers = new Map<string, OAuthProvider<unknown>>()

export function oauthFetch(
  request: Request,
  env: unknown,
  ctx: unknown,
  app: Handler,
): Promise<Response> {
  const url = new URL(request.url)
  if (!isKnownOrigin(url)) return app.fetch(request, env, ctx)
  let provider = providers.get(url.origin)
  if (!provider) {
    provider = new OAuthProvider(options(url.origin, app))
    providers.set(url.origin, provider)
  }
  // oxlint-disable-next-line typescript/no-explicit-any -- workerd types are structural here
  return provider.fetch(request, env as any, ctx as any)
}

// The consent route runs inside the app, which has no handle on the
// provider. getOAuthApi gives the same helpers from the same options.
// defaultHandler is never called here, so a stub keeps this module free of
// the app entry.
const unused: Handler = {
  fetch: () => Promise.resolve(new Response(null, { status: 404 })),
}

export function oauthApi(request: Request, env: unknown) {
  const { origin } = new URL(request.url)
  return getOAuthApi(options(origin, unused), env)
}
