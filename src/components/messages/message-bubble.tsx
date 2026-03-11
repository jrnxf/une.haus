import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  CopyIcon,
  FlagIcon,
  HeartIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import React from "react"
import { toast } from "sonner"

import { confirm } from "~/components/confirm-dialog"
import { MentionTextarea } from "~/components/input/mention-textarea"
import { RichText } from "~/components/rich-text"
import {
  Tray,
  TrayClose,
  TrayContent,
  TrayTitle,
  TrayTrigger,
} from "~/components/tray"
import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Label } from "~/components/ui/label"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { Textarea } from "~/components/ui/textarea"
import { UserOnlineStatus } from "~/components/user-online-status"
import { type FlagEntityType, FLAG_ENTITY_TYPES } from "~/db/schema"
import { useFlagContent } from "~/lib/flags/hooks"
import { useHaptics } from "~/lib/haptics"
import { stripMentionTokens } from "~/lib/mentions/parse"
import { messages } from "~/lib/messages"
import { type MessageParent } from "~/lib/messages/schemas"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { useSessionUser } from "~/lib/session/hooks"
import { type ServerFnReturn } from "~/lib/types"
import { useUserMap } from "~/lib/users/use-user-map"
import { cn } from "~/lib/utils"

type Message = ServerFnReturn<typeof messages.list.fn>["messages"][number]

export function MessageBubble({
  parent,
  message,
}: {
  parent: MessageParent
  message: Message
}) {
  const haptics = useHaptics()
  const messageType = `${parent.type}Message` as const
  const flagType = `${parent.type}Message` as FlagEntityType
  const sessionUser = useSessionUser()
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = React.useState(false)
  const [flagTrayOpen, setFlagTrayOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const { userMap } = useUserMap()
  const isOwnMessage = sessionUser && message.user.id === sessionUser.id

  const authUserLiked = Boolean(
    sessionUser &&
    message.likes.some((like) => like.user.id === sessionUser.id),
  )
  const canFlagMessage = Boolean(
    !isOwnMessage &&
    (FLAG_ENTITY_TYPES as readonly string[]).includes(flagType),
  )

  const { mutate: likeUnlike } = useLikeUnlikeRecord({
    authUserLiked,
    record: { id: message.id, type: messageType },
    optimisticUpdateQueryKey: messages.list.queryOptions(parent).queryKey,
    refetchQueryKey: messages.list.queryOptions(parent).queryKey,
  })

  const queryClient = useQueryClient()
  const { mutate: deleteMessage } = useMutation({
    mutationFn: messages.delete.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messages.list.queryOptions(parent).queryKey,
      })
      haptics.success()
      toast.success("message deleted")
      setDetailsOpen(false)
    },
    onError: () => {
      haptics.error()
      toast.error("failed to delete message")
    },
  })

  const handleLikeUnlike = () => {
    likeUnlike()
  }

  const handleCopy = () => {
    const plainText = stripMentionTokens(
      message.content,
      (id) => userMap.get(id)?.name,
    )
    navigator.clipboard.writeText(plainText)
    haptics.success()
    toast.success("message copied", { duration: 1000 })
  }

  const handleEdit = () => {
    setDetailsOpen(false)
    setEditDrawerOpen(true)
  }

  const handleDelete = () => {
    setDetailsOpen(false)
    confirm.open({
      title: "delete message?",
      description: "this action cannot be undone.",
      confirmText: "delete",
      variant: "destructive",
      onConfirm: () => {
        deleteMessage({
          data: {
            id: message.id,
            type: parent.type,
          },
        })
      },
    })
  }

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "relative flex w-full items-center gap-2",
          isOwnMessage ? "justify-end" : "justify-start",
        )}
      >
        <div
          data-testid="message-container"
          className={cn(
            "group relative flex w-max max-w-[80%] items-center gap-2",
            isOwnMessage ? "flex-row-reverse" : "flex-row",
          )}
        >
          {/* POC reference: this bubble previously rendered a menu trigger +
              dropdown actions here. The active interaction now opens a tray. */}
          <Tray open={detailsOpen} onOpenChange={setDetailsOpen}>
            <TrayTrigger asChild>
              <button
                type="button"
                data-slot="message-bubble"
                aria-label={`Message: ${message.content}`}
                className="bg-card hover:bg-accent/50 relative z-10 cursor-pointer rounded-md border px-3 py-2 text-left text-sm font-normal whitespace-pre-wrap transition-all"
                style={{ wordBreak: "break-word" }}
              >
                <RichText
                  content={message.content}
                  className="leading-relaxed"
                  disableLinks
                />
              </button>
            </TrayTrigger>
            <TrayContent
              dialogClassName="max-w-2xl"
              drawerClassName="pb-[calc(env(safe-area-inset-bottom)+1rem)]"
              showCloseButton={false}
            >
              <TrayTitle className="sr-only">message details</TrayTitle>
              <div className="flex items-center justify-between gap-3">
                <p className="flex min-w-0 items-center gap-1.5 truncate">
                  <span className="truncate text-sm font-medium">
                    {message.user.name}
                  </span>
                  {/* don't cut off the online status if truncating */}
                  <UserOnlineStatus userId={message.user.id} />
                </p>

                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  {message.likes.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          {message.likes.length}{" "}
                          {message.likes.length === 1 ? "like" : "likes"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-w-xs">
                        {message.likes.map((like) => (
                          <DropdownMenuItem key={like.user.id} asChild>
                            <Link
                              to="/users/$userId"
                              params={{ userId: like.user.id }}
                              className="flex items-center gap-2"
                            >
                              <span>{like.user.name}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div />
                  )}
                  {sessionUser && (
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={handleLikeUnlike}
                      aria-label={authUserLiked ? "unlike" : "like"}
                    >
                      <HeartIcon
                        className={cn(
                          "size-4",
                          authUserLiked && "fill-red-700/50 stroke-red-700",
                        )}
                      />
                    </Button>
                  )}

                  {sessionUser ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label="more actions"
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleCopy}>
                          <CopyIcon className="size-4" />
                          copy
                        </DropdownMenuItem>
                        {canFlagMessage && (
                          <DropdownMenuItem
                            onClick={() => {
                              setDetailsOpen(false)
                              setFlagTrayOpen(true)
                            }}
                          >
                            <FlagIcon className="size-4" />
                            flag
                          </DropdownMenuItem>
                        )}
                        {isOwnMessage && (
                          <DropdownMenuItem onClick={handleEdit}>
                            <PencilIcon className="size-4" />
                            edit
                          </DropdownMenuItem>
                        )}
                        {isOwnMessage && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={handleDelete}
                          >
                            <Trash2Icon className="size-4" />
                            delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label="copy"
                      onClick={handleCopy}
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  )}

                  <TrayClose asChild>
                    <Button size="icon-sm" variant="outline" aria-label="close">
                      <XIcon className="size-4" />
                    </Button>
                  </TrayClose>
                </div>
              </div>

              <div className="text-sm leading-relaxed">
                <RichText
                  content={message.content}
                  className="text-pretty whitespace-pre-wrap"
                />
              </div>

              <div className="flex items-center justify-end">
                <RelativeTimeCard
                  date={message.createdAt}
                  variant="muted"
                  className="text-sm tabular-nums"
                />
              </div>
            </TrayContent>
          </Tray>

          {/* Like Count Badge - opens tray on tap */}
          {message.likes.length > 0 && (
            <button
              aria-label={`${message.likes.length} likes`}
              className={cn(
                "absolute top-0 z-10 flex -translate-y-1/2 items-center rounded-xl bg-red-600 px-1.5 text-xs text-[10px] text-white",
                isOwnMessage
                  ? "left-0 -translate-x-1/3"
                  : "right-0 translate-x-1/3",
              )}
              onClick={(e) => {
                e.stopPropagation()
                setDetailsOpen(true)
              }}
            >
              <HeartIcon className="mr-1 size-2 fill-white" />
              {message.likes.length}
            </button>
          )}
        </div>
      </div>

      {/* Edit Drawer */}
      {isOwnMessage && (
        <EditMessageDrawer
          message={message}
          parent={parent}
          open={editDrawerOpen}
          onOpenChange={setEditDrawerOpen}
        />
      )}

      {sessionUser && !isOwnMessage && (
        <MessageFlagTray
          parent={parent}
          messageId={message.id}
          open={flagTrayOpen}
          onOpenChange={setFlagTrayOpen}
        />
      )}
    </>
  )
}

function EditMessageDrawer({
  message,
  parent,
  open,
  onOpenChange,
}: {
  message: Message
  parent: MessageParent
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const haptics = useHaptics()
  const queryClient = useQueryClient()
  const [content, setContent] = React.useState(message.content)
  const wasOpenRef = React.useRef(open)

  // Re-seed edit content each time the drawer opens.
  if (open && !wasOpenRef.current && content !== message.content) {
    setContent(message.content)
  }
  if (wasOpenRef.current !== open) {
    wasOpenRef.current = open
  }

  const { mutate: updateMessage, isPending: isUpdating } = useMutation({
    mutationFn: messages.update.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messages.list.queryOptions(parent).queryKey,
      })
      haptics.success()
      toast.success("message updated")
      onOpenChange(false)
    },
    onError: () => {
      haptics.error()
      toast.error("failed to update message")
    },
  })

  const { mutate: deleteMessage, isPending: isDeleting } = useMutation({
    mutationFn: messages.delete.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messages.list.queryOptions(parent).queryKey,
      })
      haptics.success()
      toast.success("message deleted")
      onOpenChange(false)
    },
    onError: () => {
      haptics.error()
      toast.error("failed to delete message")
    },
  })

  const handleUpdate = () => {
    if (!content.trim()) {
      toast.error("message cannot be empty")
      return
    }
    updateMessage({
      data: {
        id: message.id,
        type: parent.type,
        content,
      },
    })
  }

  const handleDelete = () => {
    confirm.open({
      title: "delete message?",
      description: "this action cannot be undone.",
      confirmText: "delete",
      variant: "destructive",
      onConfirm: () => {
        deleteMessage({
          data: {
            id: message.id,
            type: parent.type,
          },
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-4 p-4">
        <DialogTitle className="sr-only">edit message</DialogTitle>
        <MentionTextarea value={content} onChange={setContent} rows={4} />
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            onClick={handleDelete}
            disabled={isDeleting || isUpdating}
            aria-label="delete"
          >
            <Trash2Icon className="size-4" />
          </Button>
          <div className="flex-1" />
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating || isDeleting}
          >
            cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating || isDeleting}>
            save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MessageFlagTray({
  parent,
  messageId,
  open,
  onOpenChange,
}: {
  parent: MessageParent
  messageId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = React.useState("")
  const flagContent = useFlagContent()
  const flagType = `${parent.type}Message` as FlagEntityType

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    flagContent.mutate(
      {
        data: {
          entityType: flagType,
          entityId: messageId,
          reason,
          parentEntityId: parent.id,
        },
      },
      {
        onSuccess: () => {
          setReason("")
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Tray open={open} onOpenChange={onOpenChange}>
      <TrayContent drawerClassName="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <TrayTitle className="sr-only">flag message</TrayTitle>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="explain why this message should be reviewed"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              cancel
            </Button>
            <Button
              type="submit"
              disabled={!reason.trim() || flagContent.isPending}
            >
              {flagContent.isPending ? "submitting..." : "submit"}
            </Button>
          </div>
        </form>
      </TrayContent>
    </Tray>
  )
}
