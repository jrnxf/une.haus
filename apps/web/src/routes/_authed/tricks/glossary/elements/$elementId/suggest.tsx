import { zodResolver } from "@hookform/resolvers/zod"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { type GlossaryProposalDiff } from "~/db/schema"
import { useIsAdmin } from "~/lib/session/hooks"
import { tricks } from "~/lib/tricks"

const pathParametersSchema = z.object({
  elementId: z.coerce.number(),
})

export const Route = createFileRoute(
  "/_authed/tricks/glossary/elements/$elementId/suggest",
)({
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tricks.elements.list.queryOptions(),
    )
  },
  component: RouteComponent,
})

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
  reason: z.string().nullable(),
})

type FormValues = z.infer<typeof formSchema>

function RouteComponent() {
  const router = useRouter()
  const qc = useQueryClient()
  const { elementId } = Route.useParams()
  const isAdmin = useIsAdmin()

  const { data: elements } = useSuspenseQuery(
    tricks.elements.list.queryOptions(),
  )

  const element = elements.find((e) => e.id === elementId)

  // Admin: update directly
  const updateDirect = useMutation({
    mutationFn: tricks.elements.update.fn,
    onSuccess: () => {
      toast.success("element updated")
      qc.removeQueries({
        queryKey: tricks.elements.list.queryOptions().queryKey,
      })
      router.navigate({ to: "/tricks/glossary/elements" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Non-admin: create proposal
  const createProposal = useMutation({
    mutationFn: tricks.glossary.proposals.create.fn,
    onSuccess: () => {
      toast.success("suggestion submitted for review")
      qc.removeQueries({
        queryKey: tricks.glossary.proposals.list.queryOptions({
          status: "pending",
        }).queryKey,
      })
      router.navigate({ to: "/tricks/glossary/elements" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const rhf = useForm<FormValues>({
    defaultValues: {
      name: element?.name ?? "",
      description: element?.description ?? "",
      reason: "",
    },
    resolver: zodResolver(formSchema),
  })

  const { control, handleSubmit } = rhf

  if (!element) {
    return (
      <div className="p-6">
        <p>element not found</p>
      </div>
    )
  }

  const handleFormSubmit = (data: FormValues) => {
    if (isAdmin) {
      updateDirect.mutate({
        data: {
          id: elementId,
          name: data.name,
          description: data.description,
        },
      })
    } else {
      const diff: GlossaryProposalDiff = {}
      if (data.name !== element.name) {
        diff.name = data.name
      }
      if (data.description !== (element.description ?? null)) {
        diff.description = data.description
      }

      if (Object.keys(diff).length === 0) {
        toast.error("no changes detected")
        return
      }

      createProposal.mutate({
        data: {
          action: "edit",
          type: "element",
          name: data.name,
          description: data.description,
          targetId: elementId,
          diff,
          reason: data.reason,
        },
      })
    }
  }

  const isPending = updateDirect.isPending || createProposal.isPending

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb to="/tricks/glossary/elements">
            glossary
          </PageHeader.Crumb>
          <PageHeader.Crumb>suggest</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-lg space-y-6 p-4">
        <Form
          rhf={rhf}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit(handleFormSubmit)(event)
          }}
        >
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>description</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isAdmin && (
            <FormField
              control={control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>reason</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="explain why these changes should be made..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <ButtonGroup className="ml-auto">
            <ButtonGroup>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  router.navigate({ to: "/tricks/glossary/elements" })
                }
              >
                cancel
              </Button>
            </ButtonGroup>
            <FormSubmitButton busy={isPending}>
              {isAdmin ? "save" : "submit"}
            </FormSubmitButton>
          </ButtonGroup>
        </Form>
      </div>
    </>
  )
}
