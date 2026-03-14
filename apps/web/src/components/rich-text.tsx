import { Link } from "@tanstack/react-router"
import { Fragment } from "react"

import { type RichToken, parseRichTokens } from "~/lib/mentions/parse"
import { useUserMap } from "~/lib/users/use-user-map"
import { preprocessText } from "~/lib/utils"

type MentionMode = "link" | "accentText" | "plainText"

type RichTextProps = {
  content: string
  className?: string
  mentionMode?: MentionMode
  /** Backward-compatible alias for mentionMode="accentText" */
  disableLinks?: boolean
}

export function resolveMentionMode({
  mentionMode,
  disableLinks,
}: Pick<RichTextProps, "mentionMode" | "disableLinks">): MentionMode {
  if (mentionMode) return mentionMode
  if (disableLinks) return "accentText"
  return "link"
}

export function RichText({
  content,
  className,
  mentionMode,
  disableLinks,
}: RichTextProps) {
  const { userMap } = useUserMap()
  const tokens = parseRichTokens(preprocessText(content))
  const resolvedMentionMode = resolveMentionMode({ mentionMode, disableLinks })

  return (
    <span className={className}>
      {tokens.map((token, i) =>
        renderToken(token, i, userMap, resolvedMentionMode),
      )}
    </span>
  )
}

function renderToken(
  token: RichToken,
  key: number,
  userMap: Map<number, { id: number; name: string }>,
  mentionMode: MentionMode,
): React.ReactNode {
  switch (token.type) {
    case "text":
      return <Fragment key={key}>{token.value}</Fragment>
    case "mention": {
      const user = userMap.get(token.userId)
      if (user) {
        if (mentionMode === "accentText") {
          return (
            <span key={key} className="text-blue-400 dark:text-blue-300">
              {user.name}
            </span>
          )
        }
        if (mentionMode === "plainText") {
          return <Fragment key={key}>{user.name}</Fragment>
        }
        return (
          <Link
            key={key}
            to="/users/$userId"
            params={{ userId: user.id }}
            className="text-blue-400 dark:text-blue-300"
          >
            {user.name}
          </Link>
        )
      }
      return (
        <span key={key} className="text-muted-foreground italic">
          (deleted user)
        </span>
      )
    }
    case "bold":
      return (
        <strong key={key}>
          {token.children.map((t, i) =>
            renderToken(t, i, userMap, mentionMode),
          )}
        </strong>
      )
    case "italic":
      return (
        <em key={key}>
          {token.children.map((t, i) =>
            renderToken(t, i, userMap, mentionMode),
          )}
        </em>
      )
    case "underline":
      return (
        <u key={key}>
          {token.children.map((t, i) =>
            renderToken(t, i, userMap, mentionMode),
          )}
        </u>
      )
    case "strike":
      return (
        <s key={key}>
          {token.children.map((t, i) =>
            renderToken(t, i, userMap, mentionMode),
          )}
        </s>
      )
  }
}
