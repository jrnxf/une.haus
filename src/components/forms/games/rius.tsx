import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { MentionTextarea } from "~/components/input/mention-textarea"
import { VideoInput } from "~/components/input/video-input"
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
import { games } from "~/lib/games"
import { useCreateSet, useCreateSubmission } from "~/lib/games/rius/hooks"

export function CreateRiuSetForm() {
  const rhf = useForm<z.infer<typeof games.rius.sets.create.schema>>({
    resolver: zodResolver(games.rius.sets.create.schema),
  })

  const { control, handleSubmit } = rhf

  const createSet = useCreateSet()

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit((data) => {
          createSet.mutate({ data })
        })(event)
      }}
    >
      <FormField
        control={control}
        name="name"
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
      <FormField
        control={control}
        name="muxAssetId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>video</FormLabel>
            <FormControl>
              <VideoInput {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <ButtonGroup className="ml-auto">
        <ButtonGroup>
          <Button asChild type="button" variant="outline">
            <Link to="/games/rius/upcoming">cancel</Link>
          </Button>
        </ButtonGroup>
        <FormSubmitButton busy={createSet.isPending} />
      </ButtonGroup>
    </Form>
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
