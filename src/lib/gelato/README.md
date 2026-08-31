# Gelato print-on-demand integration

Third-party POD fulfillment via [Gelato](https://dashboard.gelato.com/docs/). No
inventory held: product definitions live in our own DB/storefront and Gelato
produces + ships on demand from its distributed network (best fit for US+EU).

## Files

| File                   | Role                                                                            |
| ---------------------- | ------------------------------------------------------------------------------- |
| `../clients/gelato.ts` | Low-level `fetch` client (`X-API-KEY`, per-service hosts, errors). Server-only. |
| `schemas.ts`           | Zod schemas for catalog search, pricing, and orders. Client-safe.               |
| `ops.server.ts`        | Server-only ops, one per Gelato endpoint.                                       |
| `fns.ts`               | `createServerFn` wrappers. All **admin-gated** (`adminOnlyMiddleware`).         |
| `index.ts`             | `gelato` facade with `queryOptions` for reads.                                  |
| `unehaus.ts`           | Brand specifics: wordmark print files + cap order-item builder.                 |

## Architecture note — why no e-commerce/Products API

Gelato's e-commerce **Products** API creates listings inside a _connected_
Shopify/Etsy/WooCommerce store. Our storefront is custom, so we **don't** use it.
Instead:

1. Product definitions (chosen blank `productUid` + print file + price) live in
   **our** DB and render in our own shop UI.
2. When a customer checks out, we call Gelato's **Order API** (`createOrder`) to
   produce + ship. Optionally quote first.
3. Catalog/pricing reads (`searchProducts`, `getPrices`) are merch-ops tools for
   picking blanks and setting retail prices — not public storefront data.

## Setup

1. Create a Gelato account and generate an API key in the
   [API portal](https://dashboard.gelato.com/).
2. Set `GELATO_API_KEY` in the server environment. (Optional in `env.ts` until
   set; the client throws a clear error if a call is attempted without it.)
3. That's it for the API path — no store connection needed for the Order API.

## Creating the une.haus wordmark cap

```ts
import { gelato } from "~/lib/gelato"
import { buildWordmarkCapOrderItem } from "~/lib/gelato/unehaus"

// 1. Find the cap catalog + a real product UID (admin only).
const catalogs = await gelato.catalogs.list.fn()
const caps = await gelato.products.search.fn({
  data: { catalogUid: "caps", limit: 50, offset: 0 },
})
// pick the blank/color you want → productUid

// 2. Confirm base price for US + EU.
await gelato.products.prices.fn({
  data: { productUid, country: "US", currency: "USD" },
})
await gelato.products.prices.fn({
  data: { productUid, country: "DE", currency: "EUR" },
})

// 3. Build the order item with the wordmark, then DRAFT-order to preview
//    (no charge, no production) before going live.
const item = buildWordmarkCapOrderItem({
  baseUrl: "https://une.haus", // Gelato fetches the print file by URL
  productUid,
  colorway: "white", // wordmark color for a dark cap
})
await gelato.orders.create.fn({
  data: {
    orderType: "draft", // switch to "order" to actually produce + ship
    orderReferenceId: "unehaus-cap-001",
    customerReferenceId: "1",
    currency: "USD",
    items: [item],
    shippingAddress: {
      /* recipient */
    },
  },
})
```

## Print assets

`public/merch/unehaus-wordmark-{black,white}.png` — 4000px transparent PNGs
exported from `public/icons/logo-full-{black,white}.svg`. Use **black** on light
garments, **white** on dark. Served publicly so Gelato can fetch them.

### Two caveats on the wordmark for caps

- **Style:** the wordmark is an _outline_ (hollow letters). It reads great large,
  but can get muddy small. For a small cap placement consider a **filled**
  single-color version.
- **Embroidery:** a wordmark cap is best **embroidered**, and embroidery needs a
  **digitized stitch file** (`.dst`/`.emb`) — a PNG/SVG won't do. The PNGs here
  are ready for DTG/transfer caps and for all printed products (tees, posters,
  totes, mugs). Digitize separately for embroidery.
