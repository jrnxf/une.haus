import { zodResolver } from "@hookform/resolvers/zod"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { SetUploadForm } from "~/components/forms/games/set-upload-form"
import { TrickLine } from "~/components/games/sius/trick-line"
import { Alert } from "~/components/ui/alert"
import { ButtonGroup } from "~/components/ui/button-group"
import { Checkbox } from "~/components/ui/checkbox"
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
  useAddSet,
  useCreateFirstSet,
  useUpdateSet,
} from "~/lib/games/sius/hooks"
import { invariant } from "~/lib/invariant"

import type { ServerFnReturn } from "~/lib/types"

export function CreateFirstSetForm({ roundId }: { roundId: number }) {
  const rhf = useForm<z.infer<typeof games.sius.sets.createFirst.schema>>({
    resolver: zodResolver(games.sius.sets.createFirst.schema),
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
        <Link to="/games/sius/$roundId" params={{ roundId }}>
          cancel
        </Link>
      }
    />
  )
}

export function AddSetForm({ roundId }: { roundId: number }) {
  const rhf = useForm<z.infer<typeof games.sius.sets.add.schema>>({
    resolver: zodResolver(games.sius.sets.add.schema),
    defaultValues: {
      roundId,
      confirmLine: false,
    },
  })

  const addSet = useAddSet()

  const { data: rounds } = useSuspenseQuery(
    games.sius.rounds.active.queryOptions(),
  )
  const round = rounds.find((c) => c.id === roundId)
  const latestSet = round?.sets?.find((set) => !set.deletedAt)

  invariant(latestSet, "Latest set not found")

  // Get the line of tricks that need to be landed
  const { data: line } = useSuspenseQuery(
    games.sius.sets.line.queryOptions({ setId: latestSet.id }),
  )

  return (
    <SetUploadForm
      rhf={rhf}
      idFieldName="roundId"
      isPending={addSet.isPending}
      onSubmit={(data) => {
        addSet.mutate({ data })
      }}
      bottomContent={
        line && line.length > 0 ? (
          <Alert className="block space-y-3">
            <TrickLine tricks={line} description="" includeYourSet />
            <FormField
              control={rhf.control}
              name="confirmLine"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      i confirm my set includes the listed tricks in order
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Alert>
        ) : undefined
      }
      cancel={
        <Link to="/games/sius/$roundId" params={{ roundId }}>
          cancel
        </Link>
      }
    />
  )
}

type EditSiuSet = NonNullable<ServerFnReturn<typeof games.sius.sets.get.fn>>

export function EditSiuSetForm({ set }: { set: EditSiuSet }) {
  const rhf = useForm<z.infer<typeof games.sius.sets.update.schema>>({
    resolver: zodResolver(games.sius.sets.update.schema),
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
            <Link to="/games/sius/sets/$setId" params={{ setId: set.id }}>
              cancel
            </Link>
          </FormCancelButton>
        </ButtonGroup>
        <FormSubmitButton busy={updateSet.isPending}>save</FormSubmitButton>
      </ButtonGroup>
    </Form>
  )
}
