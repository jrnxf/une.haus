import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBagIcon } from "lucide-react";

import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { PageHeader } from "~/components/page-header";
import { useSessionUser } from "~/lib/session/hooks";
import { users } from "~/lib/users";

export const Route = createFileRoute("/shop")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      users.shopWaitlistCount.queryOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const sessionUser = useSessionUser();

  const { data: waitlistCount } = useSuspenseQuery(
    users.shopWaitlistCount.queryOptions(),
  );

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
    <>
      <PageHeader maxWidth="max-w-2xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>shop</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
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
          {waitlistCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
              </span>
              <p className="text-muted-foreground text-sm">
                {waitlistCount} {waitlistCount === 1 ? "person" : "people"} on
                the waitlist
              </p>
            </div>
          )}
        </EmptyContent>
      </Empty>
      </div>
    </>
  );
}
