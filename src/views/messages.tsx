import { useLayoutEffect, useRef } from "react";

import { BaseMessageForm } from "~/components/forms/message";
import { MessageAuthor } from "~/components/messages/message-author";
import { MessageBubble } from "~/components/messages/message-bubble";
import { type messages } from "~/lib/messages";
import { type MessageParent } from "~/lib/messages/schemas";
import { useSessionUser } from "~/lib/session/hooks";
import { type ServerFnReturn } from "~/lib/types";
import { cn } from "~/lib/utils";
import { useScroll } from "~/lib/ux/hooks/use-scroll";

type Message = ServerFnReturn<typeof messages.list.fn>["messages"][number];

export function MessagesView({
  record,
  messages,
  handleCreateMessage: handleCreateMessage,
  scrollTargetId,
}: {
  record: MessageParent;
  messages: Message[];
  handleCreateMessage: (newMessage: string) => void;
  scrollTargetId?: string;
}) {
  const scrollCountReference = useRef(0);
  const pendingScrollRef = useRef(false);

  const sessionUser = useSessionUser();

  const { ref, scrollTo } = useScroll({ scrollTargetId });

  const lastChatMessageByUserId = messages.at(-1)?.userId;
  const chatMessageCount = messages.length;

  useLayoutEffect(() => {
    // For external scroll targets, only scroll if user just submitted
    if (scrollTargetId) {
      if (pendingScrollRef.current) {
        pendingScrollRef.current = false;
        const target = document.querySelector<HTMLElement>(
          `#${scrollTargetId}`,
        );
        if (target) target.scrollTop = target.scrollHeight;
      }
      return;
    }

    const initialLoad = scrollCountReference.current === 0;

    if (initialLoad) {
      scrollCountReference.current++;
      // don't scroll at the beginning
      return;
    }

    const lastMessageIsFromAuthUser =
      sessionUser && sessionUser.id === lastChatMessageByUserId;

    // if the page is just loading OR the last message submitted was from the
    // authenticated user, we should scroll to the bottom of the chat otherwise
    // if the new message is from a different user, don't scroll down to the
    // bottom of the thread unless the user is within 400px of the bottom
    // already
    const threshold =
      initialLoad || lastMessageIsFromAuthUser ? Number.MAX_SAFE_INTEGER : 400;

    // Why scroll on initial load if `ssr-load-scrolled-to-bottom` exists?
    // `ssr-load-scrolled-to-bottom` only works if the page is first rendered on
    // the server - in cases where the page is rendered on the client (eg
    // browser back button), we need to scroll to the bottom manually

    scrollTo("bottom", threshold);
    scrollCountReference.current++;
  }, [
    scrollTo,
    scrollTargetId,
    lastChatMessageByUserId,
    chatMessageCount,
    sessionUser,
  ]);

  return (
    <div className="h-full overflow-y-auto" ref={ref}>
      <div className="grid h-full grid-cols-1 grid-rows-[1fr_auto]">
        {messages.length === 0 && (
          <p className="text-muted-foreground mt-1">No messages</p>
        )}
        <div className="mx-auto w-full max-w-4xl space-y-2 p-4">
          {messages.map((message, index) => {
            const isAuthUserMessage = Boolean(
              sessionUser && sessionUser.id === message.user.id,
            );
            const isNewSection =
              messages[index - 1]?.user.id !== message.user.id;
            return (
              <div
                data-slot="message"
                className={cn(
                  "flex max-w-full flex-col",
                  isAuthUserMessage && "items-end",
                )}
                key={message.id}
              >
                {isNewSection && (
                  <div className={cn("mb-1", index !== 0 && "mt-4")}>
                    <MessageAuthor message={message} />
                  </div>
                )}
                <MessageBubble parent={record} message={message} />
              </div>
            );
          })}
        </div>
        <div className="mx-auto w-full max-w-4xl shrink-0 p-4">
          <BaseMessageForm
            onFocus={
              scrollTargetId ? undefined : () => scrollTo("bottom", Infinity)
            }
            onSubmit={(newMessage) => {
              if (scrollTargetId) {
                pendingScrollRef.current = true;
              } else {
                scrollTo("bottom", Infinity);
              }
              handleCreateMessage(newMessage);
            }}
          />
        </div>
      </div>
    </div>
  );
}
