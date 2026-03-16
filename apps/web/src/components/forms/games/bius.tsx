import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { SetUploadForm } from "~/components/forms/games/set-upload-form"
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
  useBackUpSet,
  useCreateFirstSet,
  useUpdateSet,
} from "~/lib/games/bius/hooks"

import type { ServerFnReturn } from "~/lib/types"

export function CreateFirstSetForm({ roundId }: { roundId: number }) {
  const rhf = useForm<z.infer<typeof games.bius.sets.createFirst.schema>>({
    resolver: zodResolver(games.bius.sets.createFirst.schema),
    defaultValues: {
      roundId,
    },
  })

  const createFirstSet = useCreateFirstSet()

  return (
    <SetUploadForm
      rhf={rhf}
      idFieldName="roundId"
      isPending={createFirstSet.isPending}
      onSubmit={(data) => {
        createFirstSet.mutate({ data })
      }}
      cancel={
        <Link to="/games/bius/$roundId" params={{ roundId }}>
          cancel
        </Link>
      }
    />
  )
}

type EditBiuSet = NonNullable<ServerFnReturn<typeof games.bius.sets.get.fn>>

export function EditBiuSetForm({ set }: { set: EditBiuSet }) {
  const rhf = useForm<z.infer<typeof games.bius.sets.update.schema>>({
    resolver: zodResolver(games.bius.sets.update.schema),
    defaultValues: {
      name: set.name,
      setId: set.id,
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
        name="setId"
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

      <ButtonGroup className="ml-auto">
        <ButtonGroup>
          <FormCancelButton asChild>
            <Link to="/games/bius/sets/$setId" params={{ setId: set.id }}>
              cancel
            </Link>
          </FormCancelButton>
        </ButtonGroup>
        <FormSubmitButton busy={updateSet.isPending}>save</FormSubmitButton>
      </ButtonGroup>
    </Form>
  )
}

export function BackUpSetForm({ roundId }: { roundId: number }) {
  const rhf = useForm<z.infer<typeof games.bius.sets.backUp.schema>>({
    resolver: zodResolver(games.bius.sets.backUp.schema),
    defaultValues: {
      roundId,
    },
  })

  const backUpSet = useBackUpSet()

  return (
    <SetUploadForm
      rhf={rhf}
      idFieldName="roundId"
      isPending={backUpSet.isPending}
      onSubmit={(data) => {
        backUpSet.mutate({ data })
      }}
      cancel={
        <Link to="/games/bius/$roundId" params={{ roundId }}>
          cancel
        </Link>
      }
    />
  )
}
