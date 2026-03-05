import { useLayoutEffect, useRef } from "react"

import { BaseMessageForm } from "~/components/forms/message"
import { MessageAuthor } from "~/components/messages/message-author"
import { MessageBubble } from "~/components/messages/message-bubble"
import { type messages } from "~/lib/messages"
import { type MessageParent } from "~/lib/messages/schemas"
import { useSessionUser } from "~/lib/session/hooks"
import { type ServerFnReturn } from "~/lib/types"
import { cn } from "~/lib/utils"
import { useScroll } from "~/lib/ux/hooks/use-scroll"

type Message = ServerFnReturn<typeof messages.list.fn>["messages"][number]

function formatDayLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = today.getTime() - target.getTime()
  const days = Math.round(diff / 86_400_000)

  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7)
    return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
  return date
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toLowerCase()
}

function isDifferentDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  )
}

function DayDivider({ date }: { date: Date }) {
  return (
    <p className="text-muted-foreground/50 py-2 text-xs">
      {formatDayLabel(date)}
    </p>
  )
}

export function MessagesView({
  record,
  messages,
  handleCreateMessage,
  scrollTargetId,
}: {
  record: MessageParent
  messages: Message[]
  handleCreateMessage: (newMessage: string) => void
  scrollTargetId?: string
}) {
  const scrollCountReference = useRef(0)
  const pendingScrollRef = useRef(false)

  const sessionUser = useSessionUser()

  const { ref } = useScroll({ scrollTargetId })

  const lastChatMessageByUserId = messages.at(-1)?.userId
  const chatMessageCount = messages.length
  useLayoutEffect(() => {
    // For external scroll targets (embedded mode)
    if (scrollTargetId) {
      const target = document.querySelector<HTMLElement>(`#${scrollTargetId}`)
      if (!target) return

      const initialLoad = scrollCountReference.current === 0

      // Scroll to bottom on initial load
      if (initialLoad) {
        target.scrollTop = target.scrollHeight
        scrollCountReference.current++
        return
      }

      // Scroll after user submits a message
      if (pendingScrollRef.current) {
        pendingScrollRef.current = false
        target.scrollTop = target.scrollHeight
      }
      return
    }

    // Non-embedded mode: scroll the window
    const initialLoad = scrollCountReference.current === 0

    // Scroll to bottom on initial load
    if (initialLoad) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" })
      scrollCountReference.current++
      return
    }

    const lastMessageIsFromAuthUser =
      sessionUser && sessionUser.id === lastChatMessageByUserId

    // if the last message submitted was from the authenticated user, scroll to
    // bottom. otherwise only scroll if user is within 400px of the bottom
    const threshold = lastMessageIsFromAuthUser ? Number.MAX_SAFE_INTEGER : 400
    const distanceFromBottom =
      document.body.scrollHeight - window.innerHeight - window.scrollY

    if (distanceFromBottom <= threshold) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" })
    }
    scrollCountReference.current++
  }, [scrollTargetId, lastChatMessageByUserId, chatMessageCount, sessionUser])

  // Scroll to and highlight a message when navigating via notification anchor link
  useLayoutEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith("#message-")) return

    const element = document.getElementById(hash.slice(1))
    if (!element) return

    element.scrollIntoView({ behavior: "smooth", block: "center" })

    const bubble = element.querySelector<HTMLElement>(
      '[data-slot="message-bubble"]',
    )
    if (bubble) {
      bubble.classList.add("animate-highlight-glow")
    }
  }, [])

  // When scrollTargetId is passed, we're embedded in a container that already
  // provides padding and max-width constraints
  const isEmbedded = Boolean(scrollTargetId)

  // For embedded mode, use the flex layout with scroll container
  if (isEmbedded) {
    return (
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto" ref={ref}>
          <div className="space-y-2">
            {messages.length === 0 && (
              <p className="text-muted-foreground">no messages</p>
            )}
            {messages.map((message, index) => {
              const prev = messages[index - 1]
              const isAuthUserMessage = Boolean(
                sessionUser && sessionUser.id === message.user.id,
              )
              const showDayDivider =
                prev &&
                isDifferentDay(
                  new Date(prev.createdAt),
                  new Date(message.createdAt),
                )
              const isNewSection = prev?.user.id !== message.user.id
              return (
                <div
                  id={`message-${message.id}`}
                  data-slot="message"
                  className={cn(
                    "flex max-w-full flex-col",
                    isAuthUserMessage && "items-end",
                  )}
                  key={message.id}
                >
                  {showDayDivider && (
                    <DayDivider date={new Date(message.createdAt)} />
                  )}
                  {isNewSection && (
                    <div
                      className={cn(
                        "mb-1",
                        index !== 0 && !showDayDivider && "mt-4",
                      )}
                    >
                      <MessageAuthor message={message} />
                    </div>
                  )}
                  <MessageBubble parent={record} message={message} />
                </div>
              )
            })}
          </div>
        </div>
        <div className="shrink-0 pt-4">
          <BaseMessageForm
            onSubmit={(newMessage) => {
              pendingScrollRef.current = true
              handleCreateMessage(newMessage)
            }}
          />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.getElementById('${scrollTargetId}')?.scrollTo(0,1e9)`,
          }}
        />
      </div>
    )
  }

  // Non-embedded: simple layout, form flows after messages
  return (
    <div className="space-y-2">
      {messages.length === 0 && (
        <p className="text-muted-foreground">No messages</p>
      )}
      {messages.map((message, index) => {
        const prev = messages[index - 1]
        const isAuthUserMessage = Boolean(
          sessionUser && sessionUser.id === message.user.id,
        )
        const showDayDivider =
          prev &&
          isDifferentDay(new Date(prev.createdAt), new Date(message.createdAt))
        const isNewSection = prev?.user.id !== message.user.id
        return (
          <div
            id={`message-${message.id}`}
            data-slot="message"
            className={cn(
              "flex max-w-full flex-col",
              isAuthUserMessage && "items-end",
            )}
            key={message.id}
          >
            {showDayDivider && (
              <DayDivider date={new Date(message.createdAt)} />
            )}
            {isNewSection && (
              <div
                className={cn("mb-1", index !== 0 && !showDayDivider && "mt-4")}
              >
                <MessageAuthor message={message} />
              </div>
            )}
            <MessageBubble parent={record} message={message} />
          </div>
        )
      })}
      <div className="pt-2">
        <BaseMessageForm
          onFocus={() =>
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "instant",
            })
          }
          onSubmit={(newMessage) => {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "instant",
            })
            handleCreateMessage(newMessage)
          }}
        />
      </div>
    </div>
  )
}
