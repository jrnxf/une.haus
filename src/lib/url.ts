import { defaultStringifySearch } from "@tanstack/react-router";

/**
 * Custom search param stringifier that keeps commas and tildes readable.
 * Per RFC 3986, these are sub-delimiters and safe in query strings.
 * Makes URLs like ?riders=1,20,~Sam,30 more readable than ?riders=1%2C20%2C~Sam%2C30
 */
export function stringifySearch(search: Record<string, unknown>): string {
  // Flatten string arrays into comma-separated values so URLs read
  // ?tags=colby,thomas instead of ?tags=%5B"colby","thomas"%5D
  const flattened: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(search)) {
    if (
      Array.isArray(value) &&
      value.every((v) => typeof v === "string" || typeof v === "number")
    ) {
      flattened[key] = value.join(",");
    } else {
      flattened[key] = value;
    }
  }
  const encoded = defaultStringifySearch(flattened);
  // Decode commas and tildes (safe in query values per RFC 3986)
  return encoded.replaceAll(/%2C/gi, ",").replaceAll(/%7E/gi, "~");
}
