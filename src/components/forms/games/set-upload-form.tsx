import { type ReactNode } from "react"
import { type Path, type UseFormReturn } from "react-hook-form"

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

type UploadFormValues = {
  name: string
  instructions?: string
  muxAssetId: string
  roundId?: number
}

export function SetUploadForm<TValues extends UploadFormValues>({
  rhf,
  isPending,
  onSubmit,
  cancel,
  topContent,
  bottomContent,
  idFieldName,
}: {
  rhf: UseFormReturn<TValues>
  isPending: boolean
  onSubmit: (data: TValues) => void
  cancel: ReactNode
  topContent?: ReactNode
  bottomContent?: ReactNode
  idFieldName?: Path<TValues>
}) {
  const { control, handleSubmit } = rhf

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit(onSubmit)(event)
      }}
    >
      {idFieldName ? (
        <FormField
          control={control}
          name={idFieldName}
          render={({ field }) => <input type="hidden" {...field} />}
        />
      ) : null}

      {topContent}

      <FormField
        control={control}
        name={"name" as Path<TValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>name</FormLabel>
            <FormControl>
              <Input
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={(field.value as string | undefined) ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"instructions" as Path<TValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>instructions</FormLabel>
            <FormControl>
              <MentionTextarea
                value={(field.value as string | undefined) ?? ""}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"muxAssetId" as Path<TValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>video</FormLabel>
            <FormControl>
              <VideoInput onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {bottomContent}

      <ButtonGroup className="ml-auto">
        <ButtonGroup>
          <FormCancelButton asChild>{cancel}</FormCancelButton>
        </ButtonGroup>
        <FormSubmitButton busy={isPending}>upload</FormSubmitButton>
      </ButtonGroup>
    </Form>
  )
}
