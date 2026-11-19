// Small helpers that every tool shares, so each result has the same shape.

// A successful result: pretty JSON for clients that only show text, and the
// same object as structuredContent for clients that read the outputSchema.
export function jsonResult<T extends Record<string, unknown>>(output: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
    structuredContent: output,
  }
}

// A failure the model should see and recover from, such as a wrong id.
// isError keeps it a normal result instead of a protocol error.
export function errorResult(text: string) {
  return { isError: true, content: [{ type: "text" as const, text }] }
}

// Mux playback ids are public, so these links open in any HLS player.
export function videoUrl(playbackId: string | null | undefined) {
  return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null
}

// Shorten long text so a list stays cheap in tokens. Detail tools return the
// full text.
export function excerpt(text: string, max = 200) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text
}

// One limit argument for every list tool: small by default, capped hard.
export const LIST_LIMIT = { default: 10, max: 50 } as const
