import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import { HeartIcon, TrendingUpIcon } from "lucide-react";

import { UsersPopover } from "~/components/users-popover";
import { Tray, TrayContent, TrayTrigger } from "~/components/tray";
import { Button } from "~/components/ui/button";
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

  const isUserMessage = Boolean(
    sessionUser && sessionUser.id === message.user.id,
  );

  const authUserLiked = Boolean(
    sessionUser &&
      message.likes.some((message) => message.user.id === sessionUser.id),
  );

  const { mutate: likeUnlike } = useLikeUnlikeRecord({
    authUserLiked,
    record: { id: message.id, type: messageType },
    optimisticUpdateQueryKey: messages.list.queryOptions(parent).queryKey,
    refetchQueryKey: messages.list.queryOptions(parent).queryKey,
  });

  return (
    <Tray>
      <TrayTrigger asChild>
        <button
          className={cn(
            "bg-card relative flex w-max max-w-[80%] cursor-pointer items-center gap-1 rounded-md border px-3 py-2 text-left text-sm font-normal whitespace-pre-wrap",
            "ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
          )}
          style={{ wordBreak: "break-word" }}
        >
          {message.likes.length > 0 && (
            <div
              className={cn(
                "absolute top-0 flex -translate-y-1/2 items-center rounded-xl bg-red-600 px-1.5 text-xs text-[10px] text-white",
                isUserMessage
                  ? "left-0 -translate-x-1/3"
                  : "right-0 translate-x-1/3",
              )}
            >
              <HeartIcon className="mr-1 size-2 fill-white" />
              {message.likes.length}
            </div>
          )}

          <p className="leading-relaxed">{preprocessText(message.content)}</p>

          {/* <RecordOptions
        onDeleteRecord={onDeleteMessage}
        onEditRecord={() => setIsEditMessageOpen(true)}
        onLikeUnlike={(action) => {
          likeUnlike.mutate({
            action,
            recordId: message.id,
            type: messageType,
            });
            }}
            onShowReactions={() => setIsReactionsOpen(true)}
            record={message}
            />
            
            <ReactionsTray
            message={message}
            onOpenChange={setIsReactionsOpen}
            open={isReactionsOpen}
            triggerRef={reactionsTriggerReference}
            />
            
            <EditMessageTray
            record={record}
            message={message}
            onOpenChange={setIsEditMessageOpen}
            open={isEditMessageOpen}
            /> */}
        </button>
      </TrayTrigger>
      <TrayContent>
        <div className="flex shrink-0 items-center gap-1 self-end">
          <Button size="icon-sm" variant="outline" onClick={likeUnlike}>
            <HeartIcon
              className={cn(
                "size-4",
                authUserLiked && "fill-red-700/50 stroke-red-700",
              )}
            />
          </Button>
          <UsersPopover
            users={message.likes.map((like) => like.user)}
            title={`${message.likes.length} ${message.likes.length === 1 ? "Like" : "Likes"}`}
            trigger={
              <Button size="icon-sm" variant="outline">
                <TrendingUpIcon className="size-4" />
              </Button>
            }
          />
        </div>
        <p className="leading-relaxed">{preprocessText(message.content)}</p>
      </TrayContent>
    </Tray>
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
