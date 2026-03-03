import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { useIsAdmin } from "~/lib/session/hooks"
import { tricks } from "~/lib/tricks"
import { generateSlug } from "~/lib/utils"

export const Route = createFileRoute(
  "/_authed/tricks/glossary/modifiers/create",
)({
  component: RouteComponent,
})

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1),
  description: z.string().nullable(),
  reason: z.string().nullable(),
})

type FormValues = z.infer<typeof formSchema>

function RouteComponent() {
  const router = useRouter()
  const qc = useQueryClient()
  const isAdmin = useIsAdmin()

  const createDirect = useMutation({
    mutationFn: tricks.modifiers.create.fn,
    onSuccess: () => {
      toast.success("modifier created")
      qc.removeQueries({
        queryKey: tricks.modifiers.list.queryOptions().queryKey,
      })
      router.navigate({ to: "/tricks/glossary/modifiers" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const createProposal = useMutation({
    mutationFn: tricks.glossary.proposals.create.fn,
    onSuccess: () => {
      toast.success("proposal submitted for review")
      qc.removeQueries({
        queryKey: tricks.glossary.proposals.list.queryOptions({
          status: "pending",
        }).queryKey,
      })
      router.navigate({ to: "/tricks/glossary/modifiers" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const rhf = useForm<FormValues>({
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      reason: "",
    },
    resolver: zodResolver(formSchema),
  })

  const { control, handleSubmit, setValue } = rhf

  const handleFormSubmit = (data: FormValues) => {
    if (isAdmin) {
      createDirect.mutate({
        data: {
          slug: data.slug,
          name: data.name,
          description: data.description,
        },
      })
    } else {
      createProposal.mutate({
        data: {
          action: "create",
          type: "modifier",
          slug: data.slug,
          name: data.name,
          description: data.description,
          reason: data.reason,
        },
      })
    }
  }

  const isPending = createDirect.isPending || createProposal.isPending

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb to="/tricks/glossary/modifiers">
            glossary
          </PageHeader.Crumb>
          <PageHeader.Crumb>create</PageHeader.Crumb>
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
                  <Input
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      setValue("slug", generateSlug(e.target.value))
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>slug</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
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
                      placeholder="why should this modifier be added?"
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
                  router.navigate({ to: "/tricks/glossary/modifiers" })
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
