import { z } from "zod"

/**
 * Zod schemas for the Gelato print-on-demand integration.
 *
 * These are client-safe (no server-only imports) so they can validate inputs in
 * `fns.ts` and be reused by React Query hooks / forms.
 */

/**
 * A Gelato product UID identifies a specific blank + size + color + decoration,
 * e.g. an embroidered cap variant. Discover real UIDs via `searchProducts`.
 */
export const gelatoProductUidSchema = z.string().min(1)

/** ISO-3166-1 alpha-2, e.g. "US", "DE". */
const countrySchema = z.string().length(2).toUpperCase()

/** ISO-4217, e.g. "USD", "EUR". */
const currencySchema = z.string().length(3).toUpperCase()

// ---------------------------------------------------------------------------
// Catalog / product discovery
// ---------------------------------------------------------------------------

export const searchProductsSchema = z.object({
  /** Catalog UID, e.g. "apparel" or "caps". List via `listCatalogs`. */
  catalogUid: z.string().min(1),
  /**
   * Attribute filters keyed by attribute UID (e.g. `{ GarmentColor: ["white"] }`).
   * Shape is provider-defined; passed through to Gelato's search endpoint.
   */
  attributeFilters: z.record(z.string(), z.array(z.string())).optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
})

export const getProductSchema = z.object({
  productUid: gelatoProductUidSchema,
})

export const getPricesSchema = z.object({
  productUid: gelatoProductUidSchema,
  country: countrySchema.default("US"),
  currency: currencySchema.default("USD"),
  /** Page count for multi-page products; 1 for apparel/caps. */
  pageCount: z.number().int().positive().optional(),
})

// ---------------------------------------------------------------------------
// Print files + order items
// ---------------------------------------------------------------------------

/**
 * A print file placed on one print area of a product. `type: "default"` is the
 * single/front print area; products with multiple areas use named types such as
 * "front", "back", or embroidery position keys. `url` must be publicly
 * reachable by Gelato (PNG, PDF, SVG, or JPEG).
 */
export const gelatoFileSchema = z.object({
  type: z.string().min(1).default("default"),
  url: z.string().url(),
})

export const gelatoOrderItemSchema = z.object({
  itemReferenceId: z.string().min(1),
  productUid: gelatoProductUidSchema,
  files: z.array(gelatoFileSchema).min(1),
  quantity: z.number().int().positive(),
})

export const gelatoShippingAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postCode: z.string().min(1),
  country: countrySchema,
  email: z.string().email(),
  phone: z.string().optional(),
})

/**
 * Create-order input. `orderType: "draft"` validates + previews without
 * charging or producing — use it to confirm a configuration (the closest thing
 * to "create a listing to inspect"). `"order"` actually produces and ships.
 */
export const createOrderSchema = z.object({
  orderType: z.enum(["draft", "order"]).default("draft"),
  orderReferenceId: z.string().min(1),
  customerReferenceId: z.string().min(1),
  currency: currencySchema.default("USD"),
  items: z.array(gelatoOrderItemSchema).min(1),
  shipmentMethodUid: z.string().optional(),
  shippingAddress: gelatoShippingAddressSchema,
})

export const getOrderSchema = z.object({
  orderId: z.string().min(1),
})

export type SearchProductsInput = z.infer<typeof searchProductsSchema>
export type GetPricesInput = z.infer<typeof getPricesSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type GelatoOrderItem = z.infer<typeof gelatoOrderItemSchema>
