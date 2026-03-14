import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { SetUploadForm } from "~/components/forms/games/set-upload-form"
import { games } from "~/lib/games"
import { useBackUpSet, useCreateFirstSet } from "~/lib/games/bius/hooks"

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
