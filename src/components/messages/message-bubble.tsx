import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import { CopyIcon, HeartIcon, PencilIcon, Trash2Icon } from "lucide-react";
import React from "react";

import { toast } from "sonner";

import { confirm } from "~/components/confirm-dialog";
import { UsersDialog } from "~/components/likes-dialog";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "~/components/ui/base-menu";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
} from "~/components/ui/drawer";
import { Textarea } from "~/components/ui/textarea";
import { useIsTablet } from "~/hooks/use-mobile";
import { messages } from "~/lib/messages";
import { type MessageParent } from "~/lib/messages/schemas";
import { useSessionUser } from "~/lib/session/hooks";
import { type ServerFnReturn } from "~/lib/types";
import { cn, preprocessText } from "~/lib/utils";

type Message = ServerFnReturn<typeof messages.list.fn>["messages"][number];

export function MessageBubble({
  parent,
  message,
}: {
  parent: MessageParent;
  message: Message;
}) {
  const isTablet = useIsTablet();
  const messageType = `${parent.type}Message` as const;
  const sessionUser = useSessionUser();
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isOwnMessage = sessionUser && message.user.id === sessionUser.id;

  const authUserLiked = Boolean(
    sessionUser &&
    message.likes.some((like) => like.user.id === sessionUser.id),
  );

  const { mutate: likeUnlike } = useLikeUnlikeRecord({
    authUserLiked,
    record: { id: message.id, type: messageType },
    optimisticUpdateQueryKey: messages.list.queryOptions(parent).queryKey,
    refetchQueryKey: messages.list.queryOptions(parent).queryKey,
  });

  const queryClient = useQueryClient();
  const { mutate: deleteMessage } = useMutation({
    mutationFn: messages.delete.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messages.list.queryOptions(parent).queryKey,
      });
      toast.success("Message deleted");
      setActionsOpen(false);
    },
    onError: () => {
      toast.error("Failed to delete message");
    },
  });

  const handleLikeUnlike = () => {
    likeUnlike();
    setActionsOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Message copied", { duration: 1000 });
    setActionsOpen(false);
  };

  const handleEdit = () => {
    // setActionsOpen(false);
    setEditDrawerOpen(true);
  };

  const handleDelete = () => {
    confirm.open({
      title: "Delete message?",
      description: "This action cannot be undone.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: () => {
        deleteMessage({
          data: {
            id: message.id,
            type: parent.type,
          },
        });
      },
    });
  };

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
          className={cn(
            "group relative flex w-max max-w-[80%] items-center gap-2",
            isOwnMessage ? "flex-row-reverse" : "flex-row",
          )}
        >
          {isTablet ? (
            <button
              onClick={() => setActionsOpen(true)}
              className="bg-card hover:bg-accent/50 relative z-10 cursor-pointer rounded-md border px-3 py-2 text-left text-sm font-normal whitespace-pre-wrap transition-all"
              style={{ wordBreak: "break-word" }}
            >
              <p className="leading-relaxed">
                {preprocessText(message.content)}
              </p>
            </button>
          ) : (
            <Menu open={actionsOpen} onOpenChange={setActionsOpen}>
              <MenuTrigger
                className="bg-card hover:bg-accent/50 relative z-10 cursor-pointer rounded-md border px-3 py-2 text-left text-sm font-normal whitespace-pre-wrap transition-all"
                style={{ wordBreak: "break-word" }}
              >
                <p className="leading-relaxed">
                  {preprocessText(message.content)}
                </p>
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
                <ReactionMenuItem
                  handleLikeUnlike={handleLikeUnlike}
                  authUserLiked={authUserLiked}
                />
                <MenuItem onClick={handleCopy}>
                  <CopyIcon className="size-4" />
                  Copy Message
                </MenuItem>
                {isOwnMessage && (
                  <>
                    <MenuSeparator />
                    <MenuItem onClick={handleEdit}>
                      <PencilIcon className="size-4" />
                      Edit
                    </MenuItem>
                    <MenuItem variant="destructive" onClick={handleDelete}>
                      <Trash2Icon className="size-4" />
                      Delete
                    </MenuItem>
                  </>
                )}
              </MenuContent>
            </Menu>
          )}

          {/* Like Count Badge - Absolutely Positioned */}
          {message.likes.length > 0 && (
            <UsersDialog
              users={message.likes.map((like) => like.user)}
              title={`${message.likes.length} ${message.likes.length === 1 ? "Like" : "Likes"}`}
              trigger={
                <button
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

      {/* Actions Drawer (Mobile Only) */}
      {isTablet && (
        <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
          <DrawerContent>
            <div className="flex w-full items-center justify-center gap-4 p-6 pt-0">
              <Button
                size="icon"
                variant="secondary"
                onClick={handleLikeUnlike}
                aria-label={authUserLiked ? "Unlike" : "Like"}
              >
                <HeartIcon
                  className={cn(
                    "size-5",
                    authUserLiked && "fill-red-700/50 stroke-red-700",
                  )}
                />
              </Button>
              <Button size="icon" variant="secondary" onClick={handleCopy} aria-label="Copy">
                <CopyIcon className="size-5" />
              </Button>
              {isOwnMessage && (
                <>
                  <Button size="icon" variant="secondary" onClick={handleEdit} aria-label="Edit">
                    <PencilIcon className="size-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={handleDelete}
                    aria-label="Delete"
                  >
                    <Trash2Icon className="size-5" />
                  </Button>
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Edit Drawer */}
      {isOwnMessage && (
        <EditMessageDrawer
          message={message}
          parent={parent}
          open={editDrawerOpen}
          onOpenChange={setEditDrawerOpen}
        />
      )}
    </>
  );
}

function EditMessageDrawer({
  message,
  parent,
  open,
  onOpenChange,
}: {
  message: Message;
  parent: MessageParent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = React.useState(message.content);

  const { mutate: updateMessage, isPending: isUpdating } = useMutation({
    mutationFn: messages.update.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messages.list.queryOptions(parent).queryKey,
      });
      toast.success("Message updated");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update message");
    },
  });

  const { mutate: deleteMessage, isPending: isDeleting } = useMutation({
    mutationFn: messages.delete.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messages.list.queryOptions(parent).queryKey,
      });
      toast.success("Message deleted");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete message");
    },
  });

  const handleUpdate = () => {
    if (!content.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    updateMessage({
      data: {
        id: message.id,
        type: parent.type,
        content,
      },
    });
  };

  const handleDelete = () => {
    confirm.open({
      title: "Delete message?",
      description: "This action cannot be undone.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: () => {
        deleteMessage({
          data: {
            id: message.id,
            type: parent.type,
          },
        });
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="p-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
        <DrawerFooter className="flex-row gap-2">
          <Button
            size="icon"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isUpdating}
            aria-label="Delete"
          >
            <Trash2Icon className="size-5" />
          </Button>
          <DrawerClose asChild>
            <Button variant="secondary" className="flex-1">
              Cancel
            </Button>
          </DrawerClose>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating || isDeleting}
            className="flex-1"
          >
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
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
  handleLikeUnlike: () => void;
  authUserLiked: boolean;
}) {
  const [isLiked] = React.useState<boolean>(authUserLiked);
  return (
    <MenuItem onClick={handleLikeUnlike}>
      <HeartIcon
        className={cn("size-4", isLiked && "fill-red-700/50 stroke-red-700")}
      />
      <span>{isLiked ? "Unlike" : "Like"}</span>
    </MenuItem>
  );
}
