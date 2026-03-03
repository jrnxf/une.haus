import { Link } from "@tanstack/react-router"
import { Fragment } from "react"

import { parseRichTokens } from "~/lib/mentions/parse"
import { useUserMap } from "~/lib/users/use-user-map"
import { preprocessText } from "~/lib/utils"

export function RichText({
  content,
  className,
  disableLinks,
}: {
  content: string
  className?: string
  /** Render mentions as styled spans instead of links (for use inside interactive elements) */
  disableLinks?: boolean
}) {
  const { userMap } = useUserMap()
  const tokens = parseRichTokens(preprocessText(content))

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
              if (disableLinks) {
                return (
                  <span key={i} className="text-blue-400 dark:text-blue-300">
                    {user.name}
                  </span>
                )
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
        }
      })}
    </span>
  )
}
