export type MentionMode = "link" | "accentText" | "plainText"

export type MentionModeOptions = {
  mentionMode?: MentionMode
  /** Backward-compatible alias for mentionMode="accentText" */
  disableLinks?: boolean
}

export function resolveMentionMode({
  mentionMode,
  disableLinks,
}: MentionModeOptions): MentionMode {
  if (mentionMode) return mentionMode
  if (disableLinks) return "accentText"
  return "link"
}
