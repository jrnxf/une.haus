import { type GelatoOrderItem } from "~/lib/gelato/schemas"

/**
 * une.haus-specific Gelato merch config: the wordmark print files and helpers
 * for building order items. Keeps brand/product specifics out of the generic
 * client so the rest of the integration stays reusable.
 */

/**
 * Public print-ready masters served from `apps/web/public/merch/`. Gelato
 * fetches print files by URL, so they must be publicly reachable — pass an
 * absolute origin (e.g. https://une.haus) when building order items.
 *
 * Use `black` on light garments, `white` on dark garments. High-res transparent
 * PNGs (4000px wide) exported from `public/icons/logo-full-{black,white}.svg`.
 *
 * NOTE — embroidery: caps printed via DTG/transfer can use these PNGs directly.
 * For *embroidered* caps (the premium option for a wordmark) Gelato needs a
 * digitized stitch file, not a PNG — see the integration README.
 */
export const WORDMARK_PRINT_FILES = {
  black: "/merch/unehaus-wordmark-black.png",
  white: "/merch/unehaus-wordmark-white.png",
} as const

export type WordmarkColorway = keyof typeof WORDMARK_PRINT_FILES

/**
 * Candidate cap product UIDs. Gelato UIDs encode blank + size + color +
 * decoration and must be confirmed against the live catalog
 * (`gelato.products.search`) before ordering — left empty until then so a
 * wrong-guess UID can't silently ship.
 */
export const UNEHAUS_CAP_PRODUCT_UIDS: Record<string, string> = {
  // e.g. embroideredCapBlack: "cap_..._color-black_..."
}

/**
 * Build a Gelato order item placing the une.haus wordmark on a cap.
 *
 * @param baseUrl absolute site origin Gelato can fetch from, e.g. "https://une.haus"
 * @param productUid confirmed cap product UID from the live catalog
 * @param colorway which wordmark file to use for the garment color
 * @param quantity number of caps
 */
export function buildWordmarkCapOrderItem({
  baseUrl,
  productUid,
  colorway,
  quantity = 1,
  printAreaType = "default",
}: {
  baseUrl: string
  productUid: string
  colorway: WordmarkColorway
  quantity?: number
  printAreaType?: string
}): GelatoOrderItem {
  const fileUrl = new URL(WORDMARK_PRINT_FILES[colorway], baseUrl).toString()
  return {
    itemReferenceId: `unehaus-cap-${colorway}`,
    productUid,
    files: [{ type: printAreaType, url: fileUrl }],
    quantity,
  }
}
