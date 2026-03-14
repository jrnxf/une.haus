import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { StringListInput } from "~/components/input/string-list-input"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { type TrickSuggestionDiff } from "~/db/schema"
import { session } from "~/lib/session"
import { tricks } from "~/lib/tricks"

export const Route = createFileRoute("/_authed/tricks/$trickId/suggest")({
  beforeLoad: async ({ context, params }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    )
    if (sessionData.user?.id === 1) {
      throw redirect({
        to: "/admin/tricks/$trickId/edit",
        params: { trickId: params.trickId },
      })
    }
  },
  loader: async ({ context, params }) => {
    // trickId is actually the slug in this route
    await context.queryClient.ensureQueryData(
      tricks.get.queryOptions({ slug: params.trickId }),
    )
  },
  component: RouteComponent,
})

const suggestionFormSchema = z.object({
  name: z.string().min(1),
  alternateNames: z.array(z.string()),
  description: z.string().nullable(),
  inventedBy: z.string().nullable(),
  yearLanded: z.number().nullable(),
  notes: z.string().nullable(),
  reason: z.string().optional(),
})

type SuggestionFormValues = z.infer<typeof suggestionFormSchema>

function RouteComponent() {
  const router = useRouter()
  const { trickId: slug } = Route.useParams()

  const { data: trick } = useSuspenseQuery(tricks.get.queryOptions({ slug }))

  const rhf = useForm<SuggestionFormValues>({
    defaultValues: {
      name: trick?.name ?? "",
      alternateNames: trick?.alternateNames ?? [],
      description: trick?.description ?? "",
      inventedBy: trick?.inventedBy ?? "",
      yearLanded: trick?.yearLanded ?? null,
      notes: trick?.notes ?? "",
      reason: "",
    },
    resolver: zodResolver(suggestionFormSchema),
  })

  const { control, handleSubmit } = rhf

  const createSuggestion = useMutation({
    mutationFn: tricks.suggestions.create.fn,
    onSuccess: () => {
      toast.success("suggestion submitted for review")
      router.navigate({ to: "/tricks/$trickId", params: { trickId: slug } })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!trick) {
    return (
      <div className="p-6">
        <p>trick not found</p>
      </div>
    )
  }

  const handleFormSubmit = (data: SuggestionFormValues) => {
    // Build diff by comparing to original trick
    const diff: TrickSuggestionDiff = {}

    if (data.name !== trick.name) {
      diff.name = data.name
    }

    const oldAltNames = trick.alternateNames ?? []
    if (JSON.stringify(data.alternateNames) !== JSON.stringify(oldAltNames)) {
      diff.alternateNames = data.alternateNames
    }

    if (data.description !== (trick.description ?? null)) {
      diff.description = data.description ?? null
    }

    if (data.inventedBy !== (trick.inventedBy ?? null)) {
      diff.inventedBy = data.inventedBy ?? null
    }

    if (data.yearLanded !== (trick.yearLanded ?? null)) {
      diff.yearLanded = data.yearLanded ?? null
    }

    if (data.notes !== (trick.notes ?? null)) {
      diff.notes = data.notes ?? null
    }

    // If no changes, don't submit
    if (Object.keys(diff).length === 0) {
      toast.error("no changes detected")
      return
    }

    createSuggestion.mutate({
      data: {
        trickId: trick.id,
        diff,
        reason: data.reason || null,
      },
    })
  }

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb to={`/tricks/${slug}`}>
            {trick.name}
          </PageHeader.Crumb>
          <PageHeader.Crumb>suggest</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tricks/$trickId" params={{ trickId: slug }}>
              <ArrowLeft className="size-4" />
              back
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/tricks/$trickId/submit-video" params={{ trickId: slug }}>
              submit
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            suggest edit:{" "}
            <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
              {trick.name}
            </code>
          </h1>
          <p className="text-muted-foreground text-sm">
            Your suggestion will be reviewed by the community
          </p>
        </div>

        <Form
          rhf={rhf}
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit(handleFormSubmit)(event)
          }}
        >
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">basic info</h3>

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
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="alternateNames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>alternate names</FormLabel>
                  <FormControl>
                    <StringListInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add alias..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* History */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">history</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={control}
                name="inventedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>invented by</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="yearLanded"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>year landed</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1900}
                        max={2100}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value?.toString() ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">notes</h3>

            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Reason */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">reason for changes</h3>

            <FormField
              control={control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="explain why these changes should be made..."
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    help reviewers understand your suggestion
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <ButtonGroup className="ml-auto">
            <ButtonGroup>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.navigate({ to: "/tricks" })}
              >
                cancel
              </Button>
            </ButtonGroup>
            <FormSubmitButton busy={createSuggestion.isPending}>
              submit
            </FormSubmitButton>
          </ButtonGroup>
        </Form>
      </div>
    </>
  )
}
