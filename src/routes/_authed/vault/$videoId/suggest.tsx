import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { Suspense } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { DisciplineSelector } from "~/components/input/discipline-selector"
import { RiderSelector } from "~/components/input/rider-selector"
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
import { USER_DISCIPLINES, type UtvVideoSuggestionDiff } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { session } from "~/lib/session"
import { users } from "~/lib/users"
import { utv } from "~/lib/utv/core"

const pathParametersSchema = z.object({
  videoId: z.coerce.number(),
})

export const Route = createFileRoute("/_authed/vault/$videoId/suggest")({
  params: {
    parse: pathParametersSchema.parse,
  },
  beforeLoad: async ({ context, params }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    )
    if (sessionData.user?.id === 1) {
      throw redirect({
        to: "/vault/$videoId/edit",
        params: { videoId: params.videoId },
      })
    }
  },
  loader: async ({ context, params: { videoId } }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(utv.get.queryOptions(videoId)),
      context.queryClient.ensureQueryData(users.all.queryOptions()),
    ])
  },
  component: RouteComponent,
})

type RiderEntry = {
  orderId: string
  userId: number | null
  name: string | null
}

// Generate a unique order ID
function generateOrderId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const suggestionFormSchema = z.object({
  title: z.string().min(1),
  disciplines: z.array(z.enum(USER_DISCIPLINES)).nullable(),
  riders: z.array(
    z.object({
      orderId: z.string(),
      userId: z.number().nullable(),
      name: z.string().nullable(),
    }),
  ),
  reason: z.string().optional(),
})

type SuggestionFormValues = z.infer<typeof suggestionFormSchema>

function RouteComponent() {
  const router = useRouter()
  const { videoId } = Route.useParams()

  const { data: video } = useSuspenseQuery(utv.get.queryOptions(videoId))

  invariant(video, "Video not found")

  const displayTitle = video.title || video.legacyTitle

  const createSuggestion = useMutation({
    mutationFn: utv.suggestions.create.fn,
    onSuccess: () => {
      toast.success("suggestion submitted for review")
      router.navigate({ to: "/vault/$videoId", params: { videoId } })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Transform riders from video for the form
  // Include user name if available, so it shows in diffs
  const currentRiders: RiderEntry[] = video.riders.map((r) => ({
    orderId: generateOrderId(),
    userId: r.userId,
    name: r.user?.name ?? r.name,
  }))

  const rhf = useForm<SuggestionFormValues>({
    defaultValues: {
      title: video.title || video.legacyTitle,
      disciplines: video.disciplines ?? null,
      riders: currentRiders,
      reason: "",
    },
    resolver: zodResolver(suggestionFormSchema),
  })

  const { control, handleSubmit } = rhf

  const handleFormSubmit = (data: SuggestionFormValues) => {
    const diff: UtvVideoSuggestionDiff = {}

    // Check title change
    if (data.title !== displayTitle) {
      diff.title = data.title
    }

    // Check disciplines change
    const oldDisciplines = video.disciplines ?? null
    if (JSON.stringify(data.disciplines) !== JSON.stringify(oldDisciplines)) {
      diff.disciplines = data.disciplines
    }

    // Check riders change — strip orderId before comparing and storing
    const currentRiderData = currentRiders.map(({ userId, name }) => ({
      userId,
      name,
    }))
    const formRiderData = data.riders.map(({ userId, name }) => ({
      userId,
      name,
    }))
    if (JSON.stringify(formRiderData) !== JSON.stringify(currentRiderData)) {
      diff.riders = formRiderData
    }

    // If no changes, don't submit
    if (Object.keys(diff).length === 0) {
      toast.error("no changes detected")
      return
    }

    createSuggestion.mutate({
      data: {
        utvVideoId: videoId,
        diff,
        reason: data.reason || null,
      },
    })
  }

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/vault">vault</PageHeader.Crumb>
          <PageHeader.Crumb to={`/vault/${videoId}`}>
            {displayTitle}
          </PageHeader.Crumb>
          <PageHeader.Crumb>suggest</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
          <Form
            rhf={rhf}
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault()
              handleSubmit(handleFormSubmit)(event)
            }}
          >
            <FormField
              control={control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="disciplines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>disciplines</FormLabel>
                  <FormControl>
                    <DisciplineSelector
                      value={field.value ?? []}
                      onChange={(disciplines) =>
                        field.onChange(
                          disciplines.length > 0 ? disciplines : null,
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    select all disciplines shown in this video
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="riders"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>riders</FormLabel>
                  <FormControl>
                    <Suspense
                      fallback={<Input disabled placeholder="search..." />}
                    >
                      <RiderSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </Suspense>
                  </FormControl>
                  <FormDescription>
                    add riders featured in this video
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>reason</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="explain why these changes should be accepted..."
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

            <ButtonGroup className="ml-auto">
              <ButtonGroup>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    router.navigate({
                      to: "/vault/$videoId",
                      params: { videoId },
                    })
                  }
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
      </div>
    </>
  )
}
