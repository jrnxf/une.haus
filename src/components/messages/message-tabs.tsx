import { Link } from "@tanstack/react-router";

import type { RecordWithLikes } from "~/models/likes";

import { useSessionUser } from "~/lib/session";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { type RouterOutputs } from "~/integrations/trpc/router";

type Message = RouterOutputs["messages"]["list"][number];

export function MessageTabs({
  // close,
  defaultValue = "reactions",
  // record,
  message,
  // tabs,
}: {
  // close: () => void;
  defaultValue?: string;
  // record: RecordWithMessages;
  message: Message;
  // tabs: {
  //   edit: {
  //     setValue: (nextValue: string) => void;
  //     value: string;
  //   };
  // };
}) {
  const sessionUser = useSessionUser();

  const isUserMessage = Boolean(
    sessionUser && sessionUser.id === message.user.id,
  );

  // const updateMessage = useUpdateMessage(record, { onSuccess: close });

  // const onUpdateMessage = (nextContent: string) => {
  //   updateMessage.mutate({
  //     content: nextContent,
  //     recordId: message.id,
  //     type: record.type,
  //   });
  // };

  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="reactions">Reactions</TabsTrigger>
        {isUserMessage && <TabsTrigger value="edit">Edit</TabsTrigger>}
      </TabsList>
      <TabsContent value="reactions">
        <LikesSection record={message} />
      </TabsContent>
      {isUserMessage && <TabsContent value="edit">gone</TabsContent>}
    </Tabs>
  );
}

function LikesSection({ record }: { record: RecordWithLikes }) {
  if (record.likes.length === 0) {
    return <p className="text-muted-foreground mt-1">No reactions</p>;
  }

  return (
    <div className="flex flex-col items-start">
      {record.likes.map((like) => (
        <Button
          asChild
          className="w-max justify-start"
          key={like.user.id}
          size="sm"
          variant="link"
        >
          <Link to="/users/$userId" params={{ userId: like.user.id }}>
            {like.user.name}
          </Link>
        </Button>
      ))}
    </div>
  );
}
