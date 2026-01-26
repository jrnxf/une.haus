import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBagIcon } from "lucide-react";

import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "~/components/ui/empty";
import { useSessionUser } from "~/lib/session/hooks";
import { users } from "~/lib/users";

export const Route = createFileRoute("/shop")({
  component: RouteComponent,
});

function RouteComponent() {
  const sessionUser = useSessionUser();

  const mutation = useMutation({
    mutationFn: () => users.setShopNotify.fn({ data: { notify: true } }),
    onSuccess: () => {
      toast.success("You'll be notified when the shop opens");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingBagIcon />
          </EmptyMedia>
          <EmptyTitle>coming soon</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          {sessionUser ? (
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Notify me when ready"}
            </Button>
          ) : (
            <Button asChild>
              <a href="/auth/code/send">Login to get notified</a>
            </Button>
          )}
        </EmptyContent>
      </Empty>
    </div>
  );
}
