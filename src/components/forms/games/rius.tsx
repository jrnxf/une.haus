import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { SetUploadForm } from "~/components/forms/games/set-upload-form"
import { VideoInput } from "~/components/input/video-input"
import { Form, FormControl, FormField, FormItem } from "~/components/ui/form"
import { games } from "~/lib/games"
import { useCreateSet, useCreateSubmission } from "~/lib/games/rius/hooks"

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
