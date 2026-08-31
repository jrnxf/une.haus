import "@tanstack/react-start/server-only"
import { gelatoRequest } from "~/lib/clients/gelato"
import {
  type CreateOrderInput,
  type GetPricesInput,
  type SearchProductsInput,
} from "~/lib/gelato/schemas"
import { logger } from "~/lib/logger"

/**
 * Server-only Gelato operations. Each function maps to one Gelato endpoint and
 * returns the raw parsed JSON. Gelato's response shapes are large and
 * provider-defined, so we type them as `GelatoJson` (a JSON object or array) and
 * let callers narrow what they use — this also satisfies TanStack's requirement
 * that a server fn returns a non-nullable, serializable value. Add typed
 * response models here as concrete usage firms up.
 */
type GelatoJson =
  | string
  | number
  | boolean
  | { [key: string]: GelatoJson }
  | GelatoJson[]

/** GET /v3/catalogs — list available product catalogs (apparel, caps, etc.). */
export async function listCatalogs(): Promise<GelatoJson> {
  return gelatoRequest({ host: "product", path: "/v3/catalogs" })
}

/** POST /v3/catalogs/{catalogUid}/products:search — browse a catalog's blanks. */
export async function searchProducts({
  data: input,
}: {
  data: SearchProductsInput
}): Promise<GelatoJson> {
  const { catalogUid, attributeFilters, limit, offset } = input
  return gelatoRequest({
    host: "product",
    method: "POST",
    path: `/v3/catalogs/${encodeURIComponent(catalogUid)}/products:search`,
    body: { attributeFilters, limit, offset },
  })
}

/** GET /v3/products/{productUid} — full detail for one product variant. */
export async function getProduct({
  data: input,
}: {
  data: { productUid: string }
}): Promise<GelatoJson> {
  return gelatoRequest({
    host: "product",
    path: `/v3/products/${encodeURIComponent(input.productUid)}`,
  })
}

/** GET /v3/products/{productUid}/prices — base prices for all quantities. */
export async function getPrices({
  data: input,
}: {
  data: GetPricesInput
}): Promise<GelatoJson> {
  return gelatoRequest({
    host: "product",
    path: `/v3/products/${encodeURIComponent(input.productUid)}/prices`,
    query: {
      country: input.country,
      currency: input.currency,
      pageCount: input.pageCount,
    },
  })
}

/**
 * POST /v4/orders — create a draft or live order.
 *
 * Defaults to a draft (validates + previews, no charge/production). Admin-gated
 * at the server-fn layer. Logs every attempt with the order reference and type
 * for traceability.
 */
export async function createOrder({
  data: input,
}: {
  data: CreateOrderInput
}): Promise<GelatoJson> {
  logger.info("gelato.createOrder", {
    orderType: input.orderType,
    orderReferenceId: input.orderReferenceId,
    items: input.items.length,
  })
  return gelatoRequest({
    host: "order",
    method: "POST",
    path: "/v4/orders",
    body: input,
  })
}

/** GET /v4/orders/{orderId} — fetch an order's status and fulfillment data. */
export async function getOrder({
  data: input,
}: {
  data: { orderId: string }
}): Promise<GelatoJson> {
  return gelatoRequest({
    host: "order",
    path: `/v4/orders/${encodeURIComponent(input.orderId)}`,
  })
}
