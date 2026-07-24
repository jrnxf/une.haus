import { zodResolver } from "@hookform/resolvers/zod"
import { type ReactNode } from "react"
import {
  type DefaultValues,
  type Path,
  type Resolver,
  useForm,
  type UseFormReturn,
} from "react-hook-form"
import { type z } from "zod"

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

// owns the form setup (schema resolver + defaults) so every set-upload
// surface gets the same validation and field-error rendering; callers only
// wire the mutation
export function SetUploadForm<TValues extends UploadFormValues>({
  schema,
  defaultValues,
  isPending,
  onSubmit,
  cancel,
  topContent,
  bottomContent,
  idFieldName,
}: {
  schema: z.ZodType<TValues, TValues>
  defaultValues?: DefaultValues<TValues>
  isPending: boolean
  onSubmit: (data: TValues) => void
  cancel: ReactNode
  topContent?: ReactNode
  bottomContent?: ReactNode | ((rhf: UseFormReturn<TValues>) => ReactNode)
  idFieldName?: Path<TValues>
}) {
  const rhf = useForm<TValues>({
    // zodResolver cannot infer through a generic ZodType; the runtime shape is
    // guaranteed by the schema prop's TValues bound
    resolver: zodResolver(schema) as unknown as Resolver<TValues>,
    defaultValues,
  })
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

      {typeof bottomContent === "function" ? bottomContent(rhf) : bottomContent}

      <ButtonGroup className="ml-auto">
        <ButtonGroup>
          <FormCancelButton asChild>{cancel}</FormCancelButton>
        </ButtonGroup>
        <FormSubmitButton busy={isPending}>upload</FormSubmitButton>
      </ButtonGroup>
    </Form>
  )
}
