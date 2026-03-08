import { zodResolver } from "@hookform/resolvers/zod"
import { Info } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { VideoInput } from "~/components/input/video-input"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import {
  Form,
  FormCancelButton,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form"
import { Textarea } from "~/components/ui/textarea"

const videoSubmitSchema = z.object({
  muxAssetId: z.string().min(1, "Please upload a video"),
  notes: z.string().max(200, "Notes must be 200 characters or less").optional(),
})

type VideoSubmitFormValues = z.infer<typeof videoSubmitSchema>

export type VideoSubmitFormProps = {
  trickName: string
  onSubmit: (data: { muxAssetId: string; notes?: string }) => void
  onCancel?: () => void
  isPending?: boolean
}

export function VideoSubmitForm({
  trickName,
  onSubmit,
  onCancel,
  isPending = false,
}: VideoSubmitFormProps) {
  const rhf = useForm<VideoSubmitFormValues>({
    defaultValues: {
      muxAssetId: "",
      notes: "",
    },
    resolver: zodResolver(videoSubmitSchema),
  })

  const { control, handleSubmit, formState } = rhf

  const handleFormSubmit = (data: VideoSubmitFormValues) => {
    onSubmit({
      muxAssetId: data.muxAssetId,
      notes: data.notes || undefined,
    })
  }

  return (
    <Form rhf={rhf} onSubmit={handleSubmit(handleFormSubmit)}>
      <FieldGroup>
        {/* Guidance Alert */}
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            submitting a video for{" "}
            <span className="font-medium">{trickName}</span>. ideal videos are
            short clips showing the trick from different angles, slow motion
            views, or POV perspectives. all from the same rider in one edit is
            best!
          </AlertDescription>
        </Alert>

        {/* Video Upload */}
        <FormField
          control={control}
          name="muxAssetId"
          render={({ field }) => (
            <FormItem>
              <FieldLabel>video *</FieldLabel>
              <FormControl>
                <VideoInput
                  onChange={(assetId) => field.onChange(assetId ?? "")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <Controller
          name="notes"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>notes</FieldLabel>
              <Textarea
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                value={field.value ?? ""}
                placeholder="pov angle, slow motion, rear view..."
                rows={2}
              />
              <FieldDescription>
                describe what makes this video unique (max 200 characters)
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Actions */}
        <Field orientation="horizontal">
          <Button type="submit" disabled={isPending || formState.isSubmitting}>
            {isPending || formState.isSubmitting
              ? "submitting..."
              : "submit video"}
          </Button>
          {onCancel && (
            <FormCancelButton onClick={onCancel}>cancel</FormCancelButton>
          )}
        </Field>
      </FieldGroup>
    </Form>
  )
}
