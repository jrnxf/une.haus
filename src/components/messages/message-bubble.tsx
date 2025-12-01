import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import {
  ChevronDownIcon,
  HeartIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import React from "react";
import { isMobile } from "react-device-detect";

import { toast } from "sonner";

import { UsersDialog } from "~/components/likes-dialog";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Textarea } from "~/components/ui/textarea";
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
  const messageType = `${parent.type}Message` as const;
  const sessionUser = useSessionUser();
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
            "group flex w-max max-w-[80%] items-center gap-2",
            isOwnMessage ? "flex-row-reverse" : "flex-row",
          )}
        >
          <div
            className="bg-card relative z-10 rounded-md border px-3 py-2 text-left text-sm font-normal whitespace-pre-wrap transition-all"
            style={{ wordBreak: "break-word" }}
          >
            {/* Like Count Badge - Absolutely Positioned */}
            {message.likes.length > 0 && (
              <UsersDialog
                users={message.likes.map((like) => like.user)}
                title={`${message.likes.length} ${message.likes.length === 1 ? "Like" : "Likes"}`}
                trigger={
                  <button
                    className={cn(
                      "absolute top-0 flex -translate-y-1/2 items-center rounded-xl bg-red-600 px-1.5 text-xs text-[10px] text-white",
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

            <p className="leading-relaxed">{preprocessText(message.content)}</p>
          </div>
          <div
            className={cn(
              "flex items-center opacity-0 transition-all duration-200",
              isOwnMessage
                ? "translate-x-2 group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100 focus-within:translate-x-0 focus-within:scale-100 focus-within:opacity-100"
                : "-translate-x-2 group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100 focus-within:translate-x-0 focus-within:scale-100 focus-within:opacity-100",
              isMobile && "scale-100 opacity-100",
            )}
          >
            {isMobile && isOwnMessage ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon-xs" variant="ghost" className="shrink-0">
                      <ChevronDownIcon className="size-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" side="left">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        likeUnlike();
                      }}
                    >
                      <HeartIcon
                        className={cn(
                          "mr-2 size-4",
                          authUserLiked
                            ? "fill-red-700/50 stroke-red-700"
                            : "opacity-25",
                        )}
                      />
                      Like
                    </DropdownMenuItem>
                    {isOwnMessage && (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setEditDrawerOpen(true);
                        }}
                      >
                        <PencilIcon className="mr-2 size-4 opacity-60" />
                        Edit
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {isOwnMessage && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditDrawerOpen(true);
                    }}
                    className="shrink-0"
                  >
                    <PencilIcon className="size-4 opacity-60" />
                  </Button>
                )}
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    likeUnlike();
                  }}
                  className="shrink-0"
                >
                  <HeartIcon
                    className={cn(
                      "size-4",
                      authUserLiked
                        ? "fill-red-700/50 stroke-red-700"
                        : "opacity-25",
                    )}
                  />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit/Delete Drawer */}
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
    if (confirm("Are you sure you want to delete this message?")) {
      deleteMessage({
        data: {
          id: message.id,
          type: parent.type,
        },
      });
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Message</DrawerTitle>
        </DrawerHeader>
        <div className="px-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
        <DrawerFooter className="flex-row gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isUpdating}
            className="flex-1"
          >
            <Trash2Icon className="mr-2 size-4" />
            Delete
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="flex-1">
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
//                   src={like.user.avatarUrl}
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
