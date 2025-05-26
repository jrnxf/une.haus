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
  onMessageCreated,
}: {
  record: MessageParent;
  messages: Message[];
  onMessageCreated: (newMessage: string) => void;
}) {
  const scrollCountReference = useRef(0);

  const sessionUser = useSessionUser();

  const { ref, scrollTo } = useScroll();

  const lastChatMessageByUserId = messages.at(-1)?.userId;
  const chatMessageCount = messages.length;

  useLayoutEffect(() => {
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
  }, [scrollTo, lastChatMessageByUserId, chatMessageCount, sessionUser]);

  return (
    <>
      {messages.length === 0 && (
        <p className="text-muted-foreground mt-1">No messages</p>
      )}
      <div
        className="-mx-4 flex grow basis-0 flex-col gap-2 overflow-y-auto p-4"
        // https://tanstack.com/router/latest/docs/framework/react/guide/scroll-restoration#manual-scroll-restoration
        // I don't like the way the scroll restoration is automatically handled
        // here because on a refresh it loads at the top of the page and then
        // jumps to the restoration point (this may be a bug with the router) by
        // manually setting the scroll restoration id and then never registering
        // it with `useElementScrollRestoration` we effectively disable the
        // router's scroll restoration for this element. interestingly,
        // disabling the scroll restoration seems to still actually do the
        // scroll restoration but not cause the jump mentioned above.
        data-scroll-restoration-id={`no-scroll-restore-${record.type}-${record.id}`}
        ref={ref}
      >
        {messages.map((message, index) => {
          const isUserMessage = Boolean(
            sessionUser && sessionUser.id === message.user.id,
          );

          const isNewSection = messages[index - 1]?.user.id !== message.user.id;

          return (
            <div
              className={cn(
                "flex max-w-full flex-col",
                isUserMessage && "items-end",
              )}
              key={message.id}
            >
              {isNewSection && (
                <div className={cn("mb-1", index !== 0 && "mt-4")}>
                  <MessageAuthor message={message} />
                </div>
              )}
              <div
                className={cn("flex w-full", isUserMessage && "justify-end")}
              >
                <MessageBubble parent={record} message={message} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="shrink-0">
        <BaseMessageForm
          onSubmit={(newMessage) => {
            scrollTo("bottom", Infinity);
            onMessageCreated(newMessage);
          }}
        />
      </div>
    </>
  );
}
