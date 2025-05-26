/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

import { Link } from "@tanstack/react-router";
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

// import { useUpdateMessage } from "~/lib/hooks/messages";

export function BaseMessageForm({
  initialContent,
  onSubmit,
}: {
  initialContent?: string;
  onSubmit: (content: string) => void;
}) {
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
            to="/auth/login"
            search={{
              redirect: "/chat",
            }}
          >
            Log in to chat
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="bg-background focus-within:ring-ring relative w-full overflow-clip rounded-lg border p-3 focus-within:ring-2"
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
      <div className="flex flex-col items-end gap-4">
        <div className="w-full space-y-2">
          <Textarea
            {...register("content")}
            className="resize-none rounded-none border-0 shadow-none focus-visible:ring-0"
            id="content"
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
            rows={4}
          />
        </div>
        <Button
          iconRight={<CornerDownLeftIcon className="size-4" />}
          type="submit"
        >
          Send
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
