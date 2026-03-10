import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ShoppingBagIcon } from "lucide-react"
import pluralize from "pluralize"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"
import { users } from "~/lib/users"

export const Route = createFileRoute("/shop")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      users.shopWaitlistCount.queryOptions(),
    )
  },
  head: () =>
    seo({
      title: "shop",
      description: "une.haus merchandise",
      path: "/shop",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const sessionUser = useSessionUser()
  const qc = useQueryClient()

  const { data: waitlist } = useSuspenseQuery(
    users.shopWaitlistCount.queryOptions(),
  )

  const waitlistQueryKey = users.shopWaitlistCount.queryOptions().queryKey

  const joinMutation = useMutation({
    mutationFn: () => users.setShopNotify.fn({ data: { notify: true } }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: waitlistQueryKey })
      const prev = qc.getQueryData(waitlistQueryKey)
      qc.setQueryData(
        waitlistQueryKey,
        (old: typeof waitlist | undefined) =>
          old && { count: old.count + 1, isOnWaitlist: true },
      )
      return { prev }
    },
    onSuccess: () => {
      toast.success("we'll notify you when the shop opens")
    },
    onError: (error, _, context) => {
      if (context?.prev) {
        qc.setQueryData(waitlistQueryKey, context.prev)
      }
      toast.error(
        error.message || "an unknown error occurred, please try again later",
      )
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: waitlistQueryKey })
    },
  })

  const othersCount = waitlist.isOnWaitlist
    ? waitlist.count - 1
    : waitlist.count

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>shop</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingBagIcon />
            </EmptyMedia>
            <EmptyTitle>coming soon</EmptyTitle>
            <EmptyDescription>
              {waitlist.count > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
                  </span>
                  <p className="text-muted-foreground text-sm">
                    {waitlist.isOnWaitlist
                      ? othersCount > 0
                        ? `you and ${othersCount} other ${pluralize("person", othersCount)} on the waitlist`
                        : "you're on the waitlist"
                      : `${waitlist.count} ${pluralize("person", waitlist.count)} on the waitlist`}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  be the first to know when the shop opens?
                </p>
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {sessionUser ? (
              !waitlist.isOnWaitlist && (
                <Button
                  onClick={() => joinMutation.mutate()}
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? "saving..." : "notify me"}
                </Button>
              )
            ) : (
              <Button asChild>
                <Link to="/auth">login to join waitlist</Link>
              </Button>
            )}
          </EmptyContent>
        </Empty>
      </div>
    </>
  )
}
