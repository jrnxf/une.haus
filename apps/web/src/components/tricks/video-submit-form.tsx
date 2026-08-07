import { zodResolver } from "@hookform/resolvers/zod"
import { Info } from "lucide-react"
import { type ReactNode } from "react"
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

type VideoSubmitFormProps = {
  trickName: string
  onSubmit: (data: { muxAssetId: string; notes?: string }) => void
  onCancel?: () => void
  isPending?: boolean
  // Rendered directly above the actions row (e.g. the single-trick attestation)
  attestation?: ReactNode
  submitDisabled?: boolean
}

export function VideoSubmitForm({
  trickName,
  onSubmit,
  onCancel,
  isPending = false,
  attestation,
  submitDisabled = false,
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
            <p className="text-pretty">
              submitting a video for{" "}
              <span className="font-medium">{trickName}</span>. ideal videos are
              high quality and show the trick done cleanly — multiple angles if
              possible, with one clip in slow motion. all from the same rider in
              one edit is best!
            </p>
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
                aria-describedby={
                  fieldState.invalid ? `${field.name}-error` : undefined
                }
                value={field.value ?? ""}
                placeholder="slow motion, rear view, second angle..."
                rows={2}
              />
              <FieldDescription>
                describe what makes this video unique (max 200 characters)
              </FieldDescription>
              {fieldState.invalid && (
                <FieldError
                  id={`${field.name}-error`}
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />

        {attestation}

        {/* Actions */}
        <Field orientation="horizontal" className="justify-end">
          {onCancel && (
            <FormCancelButton onClick={onCancel}>cancel</FormCancelButton>
          )}
          <Button
            type="submit"
            disabled={submitDisabled || isPending || formState.isSubmitting}
          >
            <span role="status">
              {isPending || formState.isSubmitting ? "saving..." : "submit"}
            </span>
          </Button>
        </Field>
      </FieldGroup>
    </Form>
  )
}
