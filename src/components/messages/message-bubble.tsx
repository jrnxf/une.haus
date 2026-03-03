import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  CopyIcon,
  FlagIcon,
  HeartCrackIcon,
  HeartIcon,
  PencilIcon,
  Trash2Icon,
  TrendingUpIcon,
} from "lucide-react"
import pluralize from "pluralize"
import React from "react"
import { toast } from "sonner"

import { confirm } from "~/components/confirm-dialog"
import { MentionTextarea } from "~/components/input/mention-textarea"
import { UsersDialog } from "~/components/likes-dialog"
import { RichText } from "~/components/rich-text"
import { Tray, TrayContent } from "~/components/tray"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "~/components/ui/base-menu"
import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { type FlagEntityType, FLAG_ENTITY_TYPES } from "~/db/schema"
import { useFlagContent } from "~/lib/flags/hooks"
import { haptics } from "~/lib/haptics"
import {
  extractMentionedUserIds,
  stripMentionTokens,
} from "~/lib/mentions/parse"
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
  const messageType = `${parent.type}Message` as const
  const navigate = useNavigate()
  const sessionUser = useSessionUser()
  const [actionsOpen, setActionsOpen] = React.useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = React.useState(false)
  const [likesDropdownOpen, setLikesDropdownOpen] = React.useState(false)
  const [flagTrayOpen, setFlagTrayOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const { userMap } = useUserMap()
  const isOwnMessage = sessionUser && message.user.id === sessionUser.id

  // Resolve mentioned users for menu items
  const mentionedUsers = React.useMemo(() => {
    const ids = extractMentionedUserIds(message.content)
    return ids
      .map((id) => userMap.get(id))
      .filter((u): u is NonNullable<typeof u> => u != null)
  }, [message.content, userMap])

  const authUserLiked = Boolean(
    sessionUser &&
    message.likes.some((like) => like.user.id === sessionUser.id),
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
      setActionsOpen(false)
    },
    onError: () => {
      haptics.error()
      toast.error("failed to delete message")
    },
  })

  const handleLikeUnlike = () => {
    likeUnlike()
    setActionsOpen(false)
  }

  const handleCopy = () => {
    const plainText = stripMentionTokens(
      message.content,
      (id) => userMap.get(id)?.name,
    )
    navigator.clipboard.writeText(plainText)
    haptics.success()
    toast.success("message copied", { duration: 1000 })
    setActionsOpen(false)
  }

  const handleEdit = () => {
    // setActionsOpen(false);
    setEditDrawerOpen(true)
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
          <Menu open={actionsOpen} onOpenChange={setActionsOpen}>
            <MenuTrigger
              aria-label={`Message: ${message.content}`}
              className="bg-card hover:bg-accent/50 relative z-10 cursor-pointer rounded-md border px-3 py-2 text-left text-sm font-normal whitespace-pre-wrap transition-all"
              style={{ wordBreak: "break-word" }}
            >
              <RichText
                content={message.content}
                className="leading-relaxed"
                disableLinks
              />
            </MenuTrigger>
            <MenuContent
              showBackdrop={true}
              side={isOwnMessage ? "left" : "right"}
              align="start"
              sideOffset={5}
              alignOffset={0}
              collisionPadding={8}
              sticky={false}
              collisionAvoidance={{
                side: "shift",
                align: "shift",
              }}
            >
              {mentionedUsers.length > 0 && (
                <>
                  {mentionedUsers.map((user) => (
                    <MenuItem
                      key={user.id}
                      onClick={() => {
                        setActionsOpen(false)
                        navigate({
                          to: "/users/$userId",
                          params: { userId: user.id },
                        })
                      }}
                    >
                      {user.name}
                    </MenuItem>
                  ))}
                  <MenuSeparator />
                </>
              )}
              {sessionUser && (
                <ReactionMenuItem
                  handleLikeUnlike={handleLikeUnlike}
                  authUserLiked={authUserLiked}
                />
              )}
              <MenuItem onClick={handleCopy}>
                <CopyIcon className="size-4" />
                copy
              </MenuItem>
              {message.likes.length > 0 && (
                <MenuItem
                  onClick={() => {
                    setActionsOpen(false)
                    setLikesDropdownOpen(true)
                  }}
                >
                  <TrendingUpIcon className="size-4" />
                  reactions
                </MenuItem>
              )}
              {sessionUser &&
                !isOwnMessage &&
                (() => {
                  const flagType = `${parent.type}Message`
                  if (
                    !(FLAG_ENTITY_TYPES as readonly string[]).includes(flagType)
                  )
                    return null
                  return (
                    <MenuItem
                      onClick={() => {
                        setActionsOpen(false)
                        setFlagTrayOpen(true)
                      }}
                    >
                      <FlagIcon className="size-4" />
                      flag
                    </MenuItem>
                  )
                })()}
              {isOwnMessage && (
                <>
                  <MenuSeparator />
                  <MenuItem onClick={handleEdit}>
                    <PencilIcon className="size-4" />
                    edit
                  </MenuItem>
                  <MenuItem variant="destructive" onClick={handleDelete}>
                    <Trash2Icon className="size-4" />
                    delete
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>

          {/* Like Count Badge - Absolutely Positioned */}
          {message.likes.length > 0 && (
            <UsersDialog
              users={message.likes.map((like) => like.user)}
              title={`${message.likes.length} ${pluralize("Like", message.likes.length)}`}
              open={likesDropdownOpen}
              onOpenChange={setLikesDropdownOpen}
              trigger={
                <button
                  aria-label={`${message.likes.length} likes`}
                  className={cn(
                    "absolute top-0 z-10 flex -translate-y-1/2 items-center rounded-xl bg-red-600 px-1.5 text-xs text-[10px] text-white",
                    isOwnMessage
                      ? "left-0 -translate-x-1/3"
                      : "right-0 translate-x-1/3",
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <HeartIcon className="mr-1 size-2 fill-white" />
                  {message.likes.length}
                </button>
              }
            />
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
      <TrayContent>
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

// function EditMessageTray({
//   record,
//   message,
//   onOpenChange,
//   open,
// }: {
//   record: RecordWithMessages;
//   message: Message;
//   onOpenChange: (open: boolean) => void;
//   open: boolean;
// }) {
//   return (
//     <Tray onOpenChange={onOpenChange} open={open}>
//       <TrayContent
//         className="flex max-h-3/4 grow flex-col gap-2"
//         dialogClassName="p-0"
//       >
//         <TrayTitle className="sr-only">Reactions</TrayTitle>
//         <EditMessageForm
//           record={record}
//           message={message}
//           onSuccess={() => {
//             onOpenChange(false);
//           }}
//         />
//       </TrayContent>
//     </Tray>
//   );
// }

// /**
//  * NOTE: I tried having the markup look like:
//  * dropdown-menu
//  *   tray
//  *     tray-trigger (reactions)
//  *     tray-content
//  *
//  * this worked great in chrome but safari could not render the layout correctly,
//  * so opting for this method instead where the focus returns on close but
//  * without the nested markup
//  */
// function ReactionsTray({
//   message,
//   onOpenChange,
//   open,
//   triggerRef,
// }: {
//   message: Message;
//   onOpenChange: (open: boolean) => void;
//   open: boolean;
//   triggerRef?: React.RefObject<HTMLElement>;
// }) {
//   return (
//     <Tray onOpenChange={onOpenChange} open={open}>
//       <TrayContent
//         className="flex grow flex-col gap-2"
//         drawerClassName="min-h-[400px]"
//         onCloseAutoFocus={() => {
//           triggerRef?.current?.focus();
//         }}
//       >
//         <TrayTitle className="sr-only">Reactions</TrayTitle>
//         <div className="flex flex-col gap-2">
//           <p className="text-muted-foreground text-xs font-semibold uppercase">
//             Reactions
//           </p>
//           {message.likes.length === 0 && (
//             <p className="text-muted-foreground text-sm">No reactions yet</p>
//           )}
//           {message.likes.map((like) => (
//             <div className="flex items-center gap-2" key={like.user.id}>
//               <Avatar className="size-6 rounded-lg">
//                 <AvatarImage
//                   alt={like.user.name}
//                   height={28}
//                   quality={70}
//                   src={like.user.avatarId}
//                   width={28}
//                 />
//                 <AvatarFallback className="text-xs" name={like.user.name} />
//               </Avatar>
//               <p className="truncate text-base">{like.user.name}</p>
//             </div>
//           ))}
//         </div>
//       </TrayContent>
//     </Tray>
//   );
// }

/**
 * uses state so the text does not flicker when the like is toggled
 * @param param0
 * @returns
 */
function ReactionMenuItem({
  handleLikeUnlike,
  authUserLiked,
}: {
  handleLikeUnlike: () => void
  authUserLiked: boolean
}) {
  const [isLiked] = React.useState<boolean>(authUserLiked)
  return (
    <MenuItem onClick={handleLikeUnlike}>
      {isLiked ? (
        <HeartCrackIcon className="size-4" />
      ) : (
        <HeartIcon className="size-4" />
      )}
      <span>{isLiked ? "unlike" : "like"}</span>
    </MenuItem>
  )
}
