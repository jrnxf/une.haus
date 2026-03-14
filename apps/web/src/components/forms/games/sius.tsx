import { zodResolver } from "@hookform/resolvers/zod"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { SetUploadForm } from "~/components/forms/games/set-upload-form"
import { TrickLine } from "~/components/games/sius/trick-line"
import { Alert } from "~/components/ui/alert"
import { Checkbox } from "~/components/ui/checkbox"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form"
import { games } from "~/lib/games"
import { useAddSet, useCreateFirstSet } from "~/lib/games/sius/hooks"
import { invariant } from "~/lib/invariant"

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
