import { Link } from "@tanstack/react-router"
import { Fragment } from "react"

import { parseRichTokens } from "~/lib/mentions/parse"
import { useUserMap } from "~/lib/users/use-user-map"
import { preprocessText } from "~/lib/utils"

export type MentionMode = "link" | "accentText" | "plainText"

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
      {tokens.map((token, i) => {
        switch (token.type) {
          case "text": {
            return <Fragment key={i}>{token.value}</Fragment>
          }
          case "mention": {
            const user = userMap.get(token.userId)
            if (user) {
              if (resolvedMentionMode === "accentText") {
                return (
                  <span key={i} className="text-blue-400 dark:text-blue-300">
                    {user.name}
                  </span>
                )
              }
              if (resolvedMentionMode === "plainText") {
                return <Fragment key={i}>{user.name}</Fragment>
              }
              return (
                <Link
                  key={i}
                  to="/users/$userId"
                  params={{ userId: user.id }}
                  className="text-blue-400 dark:text-blue-300"
                >
                  {user.name}
                </Link>
              )
            }
            return (
              <span key={i} className="text-muted-foreground italic">
                (deleted user)
              </span>
            )
          }
          case "bold": {
            return <strong key={i}>{token.value}</strong>
          }
          case "italic": {
            return <em key={i}>{token.value}</em>
          }
          case "underline": {
            return <u key={i}>{token.value}</u>
          }
          case "strike": {
            return <s key={i}>{token.value}</s>
          }
        }
      })}
    </span>
  )
}
