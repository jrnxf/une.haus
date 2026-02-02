import { defaultStringifySearch } from "@tanstack/react-router";

/**
 * Custom search param stringifier that keeps commas and tildes readable.
 * Per RFC 3986, these are sub-delimiters and safe in query strings.
 * Makes URLs like ?riders=1,20,~Sam,30 more readable than ?riders=1%2C20%2C~Sam%2C30
 */
export function stringifySearch(search: Record<string, unknown>): string {
  const encoded = defaultStringifySearch(search);
  // Decode commas and tildes (safe in query values per RFC 3986)
  return encoded.replace(/%2C/gi, ",").replace(/%7E/gi, "~");
}
