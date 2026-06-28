import { env } from "~/lib/env"

/**
 * Thin REST client for the Gelato print-on-demand API.
 *
 * Gelato ships no maintained JS SDK, so this is a small typed `fetch` wrapper.
 * It is server-only: it reads the secret `GELATO_API_KEY` and is only imported
 * from `*.server.ts` modules.
 *
 * Gelato splits its API across per-service hosts, all authenticated with the
 * same `X-API-KEY` header:
 *   - order.gelatoapis.com   — orders (create / get / quote)
 *   - product.gelatoapis.com — catalog, products, prices
 *   - ecommerce.gelatoapis.com — store products (only for connected
 *     Shopify/Etsy/WooCommerce stores; unused here — our storefront is custom,
 *     so product definitions live in our own DB and Gelato only fulfills).
 *
 * Docs: https://dashboard.gelato.com/docs/
 */
export const GELATO_HOSTS = {
  order: "https://order.gelatoapis.com",
  product: "https://product.gelatoapis.com",
  ecommerce: "https://ecommerce.gelatoapis.com",
} as const

export type GelatoHost = keyof typeof GELATO_HOSTS

export class GelatoError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.name = "GelatoError"
    this.status = status
    this.body = body
  }
}

type GelatoRequestOptions = {
  /** Which Gelato service host to hit. */
  host: GelatoHost
  /** Path beginning with a slash, e.g. `/v4/orders`. */
  path: string
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  /** JSON body; serialized automatically. */
  body?: unknown
  /** Query params; undefined values are dropped. */
  query?: Record<string, string | number | boolean | undefined>
}

function buildUrl(options: GelatoRequestOptions): string {
  const url = new URL(options.path, GELATO_HOSTS[options.host])
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

/**
 * Perform an authenticated Gelato API request and parse the JSON response.
 * Throws {@link GelatoError} on non-2xx responses with the parsed error body.
 */
export async function gelatoRequest<T>(
  options: GelatoRequestOptions,
): Promise<T> {
  const apiKey = env.GELATO_API_KEY
  if (!apiKey) {
    throw new GelatoError(
      0,
      null,
      "GELATO_API_KEY is not set — add it to the environment to enable Gelato calls.",
    )
  }

  const response = await fetch(buildUrl(options), {
    method: options.method ?? "GET",
    headers: {
      "X-API-KEY": apiKey,
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  const parsed: unknown = text ? safeJsonParse(text) : null

  if (!response.ok) {
    throw new GelatoError(
      response.status,
      parsed,
      `Gelato ${options.method ?? "GET"} ${options.path} failed (${response.status})`,
    )
  }

  return parsed as T
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
