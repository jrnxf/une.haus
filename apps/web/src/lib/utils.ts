import { type ClassValue, clsx } from "clsx"
import pluralize from "pluralize"
import { twMerge } from "tailwind-merge"
import { ZodError } from "zod"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a ZodError into a string
 */
export function zodErrorFmt(error: ZodError) {
  const errorCount = error.issues.length
  return `Validation ${pluralize("error", errorCount)}: ${error.issues.map((issue) => issue.message).join(",")}`
}

export function errorFmt(error: unknown) {
  return error instanceof ZodError
    ? zodErrorFmt(error)
    : error instanceof Error
      ? error.message
      : String(error)
}

export const preferCdn = (url?: string | null): string => {
  if (!url) return ""
  return url.replace(
    new URL(url).origin,
    "https://d21ywshxutk0x0.cloudfront.net",
  )
}

export function getUserInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((sub) => sub.charAt(0))
}

/**
 * 1. trims text
 * 2. replaces any instance of 3 or more line breaks with just 2. This gives
 *    users the ability to have at most one blank line in between text they
 *    write.
 */
export function preprocessText(text: string) {
  return text.trim().replaceAll(/\n{3,}/g, "\n\n")
}

export function isDefined<T>(x: T): x is NonNullable<T> {
  return x !== null && x !== undefined
}

/**
 * Do `itemValues` and `filterValues` contain exactly the same distinct values?
 * Both sides are stringified so numeric and string ids compare consistently.
 * Backs the "equal" filter operator, which matches a record only when its tag
 * set is identical to the selected filter set.
 */
export function setsEqual(
  itemValues: readonly (string | number)[],
  filterValues: readonly (string | number)[],
): boolean {
  const filterSet = new Set(filterValues.map(String))
  const itemSet = new Set(itemValues.map(String))
  if (itemSet.size !== filterSet.size) return false
  for (const value of filterSet) {
    if (!itemSet.has(value)) return false
  }
  return true
}

export function getCloudflareImageUrl(
  id: string,
  options: { width: number; quality: number },
) {
  return `https://une.haus/cdn-cgi/imagedelivery/-HCgnZBcmFH51trvA-5j4Q/${id}/width=${options.width},quality=${options.quality}`
}

export function generateSlug(value: string) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
}
