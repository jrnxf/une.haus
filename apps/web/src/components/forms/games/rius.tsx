import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { SetUploadForm } from "~/components/forms/games/set-upload-form"
import { MentionTextarea } from "~/components/input/mention-textarea"
import { VideoInput } from "~/components/input/video-input"
import { ButtonGroup } from "~/components/ui/button-group"
import {
  Form,
  FormCancelButton,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { games } from "~/lib/games"
import {
  useCreateSet,
  useCreateSubmission,
  useUpdateSet,
} from "~/lib/games/rius/hooks"
import { type ServerFnReturn } from "~/lib/types"

export function CreateRiuSetForm() {
  const rhf = useForm<z.infer<typeof games.rius.sets.create.schema>>({
    resolver: zodResolver(games.rius.sets.create.schema),
  })

  const createSet = useCreateSet()

  return (
    <SetUploadForm
      rhf={rhf}
      isPending={createSet.isPending}
      onSubmit={(data) => {
        createSet.mutate({ data })
      }}
      cancel={<Link to="/games/rius/upcoming">cancel</Link>}
    />
  )
}

export function CreateRiuSubmissionForm({ riuSetId }: { riuSetId: number }) {
  const rhf = useForm<z.infer<typeof games.rius.submissions.create.schema>>({
    resolver: zodResolver(games.rius.submissions.create.schema),
    defaultValues: {
      riuSetId,
    },
  })

  const { control, handleSubmit } = rhf

  const createSubmission = useCreateSubmission()

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={handleSubmit((data) => {
        createSubmission.mutate({ data })
      })}
    >
      <FormField
        control={control}
        name="riuSetId"
        render={({ field }) => <input type="hidden" {...field} />}
      />

      <FormField
        control={control}
        name="muxAssetId"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <VideoInput
                {...field}
                showPreview={false}
                onChange={(assetId) => {
                  field.onChange(assetId)
                  handleSubmit((data) => {
                    createSubmission.mutate({ data })
                  })()
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  )
}

type EditRiuSet = NonNullable<ServerFnReturn<typeof games.rius.sets.get.fn>>

export function EditRiuSetForm({ set }: { set: EditRiuSet }) {
  const rhf = useForm<z.infer<typeof games.rius.sets.update.schema>>({
    resolver: zodResolver(games.rius.sets.update.schema),
    defaultValues: {
      instructions: set.instructions ?? "",
      name: set.name,
      riuSetId: set.id,
    },
  })

  const updateSet = useUpdateSet({ setId: set.id })
  const { control, handleSubmit } = rhf

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit((data) => {
          updateSet.mutate({ data })
        })(event)
      }}
    >
      <FormField
        control={control}
        name="riuSetId"
        render={({ field }) => <input type="hidden" {...field} />}
      />

      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>name</FormLabel>
            <FormControl>
              <Input
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>instructions</FormLabel>
            <FormControl>
              <MentionTextarea
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <ButtonGroup className="ml-auto">
        <ButtonGroup>
          <FormCancelButton asChild>
            <Link to="/games/rius/sets/$setId" params={{ setId: set.id }}>
              cancel
            </Link>
          </FormCancelButton>
        </ButtonGroup>
        <FormSubmitButton busy={updateSet.isPending}>save</FormSubmitButton>
      </ButtonGroup>
    </Form>
  )
}
