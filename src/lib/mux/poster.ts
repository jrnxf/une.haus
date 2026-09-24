import queryString from "query-string"

export function getMuxPoster({
  playbackId,
  width,
  height,
  time = 0,
  format = "webp",
}: {
  playbackId: null | string | undefined
  time?: number
  height?: number
  width?: number
  // webp for in-app images; jpg for OG images since some scrapers reject webp
  format?: "jpg" | "png" | "webp"
}) {
  if (!playbackId) {
    return undefined
  }

  return queryString.stringifyUrl({
    url: `https://image.mux.com/${playbackId}/thumbnail.${format}`,
    query: {
      time,
      height,
      width,
    },
  })
}
