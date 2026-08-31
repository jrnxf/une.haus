import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import {
  createOrderSchema,
  getOrderSchema,
  getPricesSchema,
  getProductSchema,
  searchProductsSchema,
} from "~/lib/gelato/schemas"
import { adminOnlyMiddleware } from "~/lib/middleware"

const loadGelatoOps = createServerOnlyFn(
  () => import("~/lib/gelato/ops.server"),
)

// --- Catalog / pricing reads (admin-gated: these are merch-ops tools, not
// public storefront data; product/pricing surfaced to shoppers comes from our
// own DB once a listing is configured). ---

export const listCatalogsServerFn = createServerFn({ method: "GET" })
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    const { listCatalogs } = await loadGelatoOps()
    return listCatalogs()
  })

export const searchProductsServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(searchProductsSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { searchProducts } = await loadGelatoOps()
    return searchProducts(ctx)
  })

export const getProductServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getProductSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { getProduct } = await loadGelatoOps()
    return getProduct(ctx)
  })

export const getPricesServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getPricesSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { getPrices } = await loadGelatoOps()
    return getPrices(ctx)
  })

// --- Order writes (admin-gated). Draft orders preview a configuration; live
// orders produce + ship. ---

export const createOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(createOrderSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { createOrder } = await loadGelatoOps()
    return createOrder(ctx)
  })

export const getOrderServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getOrderSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { getOrder } = await loadGelatoOps()
    return getOrder(ctx)
  })
