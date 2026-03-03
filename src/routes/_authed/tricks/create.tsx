import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"

import { TrickForm } from "~/components/forms/trick"
import { PageHeader } from "~/components/page-header"
import { session } from "~/lib/session"
import { tricks } from "~/lib/tricks"
import { type CreateTrickArgs } from "~/lib/tricks/schemas"
import { createSubmissionSchema } from "~/lib/tricks/submissions/schemas"
import { users } from "~/lib/users"

export const Route = createFileRoute("/_authed/tricks/create")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(tricks.elements.list.queryOptions()),
      context.queryClient.ensureQueryData(users.all.queryOptions()),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: sessionData } = useSuspenseQuery(session.get.queryOptions())
  const isAdmin = sessionData.user?.id === 1

  const createSubmission = useMutation({
    mutationFn: tricks.submissions.create.fn,
    onSuccess: () => {
      toast.success("trick submitted for review")
      router.navigate({ to: "/tricks" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const createTrickDirectly = useMutation({
    mutationFn: tricks.create.fn,
    onSuccess: () => {
      toast.success("trick created")
      qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey })
      router.navigate({ to: "/tricks" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (data: CreateTrickArgs) => {
    const parsed = createSubmissionSchema.safeParse(data)
    if (parsed.success) {
      createSubmission.mutate({ data: parsed.data })
    } else {
      console.error("[create] Validation failed:", parsed.error.flatten())
      const fieldErrors = parsed.error.flatten().fieldErrors
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
        .join("; ")
      toast.error(errorMessages || "invalid submission data")
    }
  }

  const handleAdminSubmit = (data: CreateTrickArgs) => {
    createTrickDirectly.mutate({ data })
  }

  const isPending = createSubmission.isPending || createTrickDirectly.isPending

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>create</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
        <TrickForm
          onSubmit={handleSubmit}
          onAdminSubmit={isAdmin ? handleAdminSubmit : undefined}
          onCancel={() => router.navigate({ to: "/tricks" })}
          submitLabel="submit"
          isPending={isPending}
        />
      </div>
    </>
  )
}
