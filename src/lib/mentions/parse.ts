const MENTION_REGEX = /@\[(\d+)\]/g

/** Extract unique user IDs from a content string containing @[userId] tokens */
export function extractMentionedUserIds(content: string): number[] {
  const ids = new Set<number>()
  for (const match of content.matchAll(MENTION_REGEX)) {
    ids.add(Number(match[1]))
  }
  return [...ids]
}

/** Strip @[userId] tokens to @name using a user map, for clipboard/email use */
export function stripMentionTokens(
  content: string,
  resolveUser: (id: number) => string | undefined,
): string {
  return content.replace(MENTION_REGEX, (_, id) => {
    const name = resolveUser(Number(id))
    return name ? `@${name}` : "@deleted user"
  })
}

/** Strip @[userId] tokens without name resolution, for server-side previews */
export function stripMentionTokensPlain(content: string): string {
  return content.replace(MENTION_REGEX, "@user")
}

// -- Rich text tokenizer (used by RichText component) --

export type RichToken =
  | { type: "text"; value: string }
  | { type: "mention"; userId: number }
  | { type: "bold"; children: RichToken[] }
  | { type: "italic"; children: RichToken[] }
  | { type: "underline"; children: RichToken[] }
  | { type: "strike"; children: RichToken[] }

// Order matters: *** before ** before * to resolve ambiguity
const TOKEN_REGEX =
  /@\[(\d+)\]|~~(.+?)~~|__(.+?)__|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g

/** Parse a content string into structured tokens for rendering (recursive) */
export function parseRichTokens(content: string): RichToken[] {
  const tokens: RichToken[] = []
  let lastIndex = 0

  for (const match of content.matchAll(TOKEN_REGEX)) {
    const index = match.index ?? 0

    if (index > lastIndex) {
      tokens.push({ type: "text", value: content.slice(lastIndex, index) })
    }

    if (match[1]) {
      tokens.push({ type: "mention", userId: Number(match[1]) })
    } else if (match[2]) {
      tokens.push({ type: "strike", children: parseRichTokens(match[2]) })
    } else if (match[3]) {
      tokens.push({ type: "underline", children: parseRichTokens(match[3]) })
    } else if (match[4]) {
      // ***...*** = bold wrapping italic
      tokens.push({
        type: "bold",
        children: [{ type: "italic", children: parseRichTokens(match[4]) }],
      })
    } else if (match[5]) {
      tokens.push({ type: "bold", children: parseRichTokens(match[5]) })
    } else if (match[6]) {
      tokens.push({ type: "italic", children: parseRichTokens(match[6]) })
    }

    lastIndex = index + match[0].length
  }

  if (lastIndex < content.length) {
    tokens.push({ type: "text", value: content.slice(lastIndex) })
  }

  return tokens
}

// -- tiptap format converters --

type JSONContent = {
  type?: string
  attrs?: Record<string, unknown>
  content?: JSONContent[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Convert storage format to HTML that tiptap can parse as initial content */
export function storageToHTML(
  content: string,
  userMap: Map<number, { name: string }>,
): string {
  if (!content) return "<p></p>"

  const lines = content.split("\n")
  return lines
    .map((line) => {
      if (!line) return "<p><br></p>"
      const tokens = parseRichTokens(line)
      const html = tokens.map((t) => tokenToHTML(t, userMap)).join("")
      return `<p>${html}</p>`
    })
    .join("")
}

function tokenToHTML(
  token: RichToken,
  userMap: Map<number, { name: string }>,
): string {
  switch (token.type) {
    case "text":
      return escapeHTML(token.value)
    case "mention": {
      const user = userMap.get(token.userId)
      const label = user?.name ?? "unknown"
      return `<span data-type="mention" data-id="${token.userId}" data-label="${escapeHTML(label)}"></span>`
    }
    case "bold":
      return `<strong>${token.children.map((t) => tokenToHTML(t, userMap)).join("")}</strong>`
    case "italic":
      return `<em>${token.children.map((t) => tokenToHTML(t, userMap)).join("")}</em>`
    case "underline":
      return `<u>${token.children.map((t) => tokenToHTML(t, userMap)).join("")}</u>`
    case "strike":
      return `<s>${token.children.map((t) => tokenToHTML(t, userMap)).join("")}</s>`
  }
}

/** Convert tiptap JSON document to storage format */
export function tiptapToStorage(doc: JSONContent): string {
  if (!doc.content) return ""

  return doc.content
    .map((node) => {
      if (node.type === "paragraph") {
        return serializeInlineContent(node.content)
      }
      return ""
    })
    .join("\n")
}

function serializeInlineContent(content?: JSONContent[]): string {
  if (!content) return ""
  return content
    .map((node) => {
      if (node.type === "mention") {
        return `@[${node.attrs?.id}]`
      }
      if (node.type === "hardBreak") {
        return "\n"
      }
      if (node.type === "text") {
        let text = node.text ?? ""
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === "bold") text = `**${text}**`
            if (mark.type === "italic") text = `*${text}*`
            if (mark.type === "underline") text = `__${text}__`
            if (mark.type === "strike") text = `~~${text}~~`
          }
        }
        return text
      }
      return ""
    })
    .join("")
}
