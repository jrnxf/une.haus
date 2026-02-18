/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

import { Link, useLocation } from "@tanstack/react-router";
import { CornerDownLeftIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  messageFormSchema,
  type MessageFormOutput,
} from "~/lib/messages/schemas";
import { useSessionUser } from "~/lib/session/hooks";

export function BaseMessageForm({
  initialContent,
  onSubmit,
  onFocus,
}: {
  initialContent?: string;
  onSubmit: (content: string) => void;
  onFocus?: () => void;
}) {
  const location = useLocation();
  const sessionUser = useSessionUser();
  const { getValues, handleSubmit, register, setFocus, setValue } =
    useForm<MessageFormOutput>({
      defaultValues: {
        content: initialContent,
      },
      resolver: zodResolver(messageFormSchema),
    });

  const reset = () => {
    setValue("content", "");
  };

  if (!sessionUser) {
    return (
      <div className="grid place-items-center pt-3">
        <Button asChild>
          <Link
            to="/auth/code/send"
            search={{
              redirect: location.href,
            }}
          >
            log in to chat
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="bg-background focus-within:ring-ring relative w-full overflow-clip rounded-lg border focus-within:ring-2"
      method="post"
      onClick={() => setFocus("content")}
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit((data) => {
          onSubmit(data.content);
          reset();
        })(event);
      }}
    >
      <div className="dark:bg-input/30 flex items-end bg-transparent px-2">
        <div className="w-full space-y-2">
          <Textarea
            {...register("content")}
            className="[field-sizing:content] min-h-11 resize-none rounded-none border-0 border-transparent px-1.5 py-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
            id="content"
            rows={1}
            placeholder="write a message..."
            onFocus={onFocus}
            onKeyDown={(event) => {
              if (event.code === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                // hitting enter submits, enter while holding shift gives you a
                // new line
                const message = getValues().content;
                if (message) {
                  onSubmit(message);
                  reset();
                }
              }
            }}
          />
        </div>
        <Button
          type="submit"
          size="icon-sm"
          variant="secondary"
          className="mb-1.5"
        >
          <CornerDownLeftIcon className="size-4" />
        </Button>
      </div>
    </form>
  );
}

// export function EditMessageForm({
//   record,
//   message,
//   onSuccess,
// }: {
//   record: RecordWithMessages;
//   message: {
//     content: string;
//     id: number;
//   };
//   onSuccess?: () => void;
// }) {
//   const updateMessage = useUpdateMessage(record, {
//     onSuccess: () => {
//       onSuccess?.();
//     },
//   });

//   const onUpdateMessage = (nextContent: string) => {
//     updateMessage.mutate({
//       content: nextContent,
//       recordId: message.id,
//       type: record.type,
//     });
//   };

//   return (
//     <BaseMessageForm
//       initialContent={message.content}
//       onSubmit={onUpdateMessage}
//     />
//   );
// }
