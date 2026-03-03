import { zodResolver } from "@hookform/resolvers/zod"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { TrickLine } from "~/components/games/sius/trick-line"
import { VideoInput } from "~/components/input/video-input"
import { Alert } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { games } from "~/lib/games"
import { useAddSet, useStartRound } from "~/lib/games/sius/hooks"

export function StartRoundForm() {
  const rhf = useForm<z.infer<typeof games.sius.rounds.start.schema>>({
    resolver: zodResolver(games.sius.rounds.start.schema),
  })

  const { control, handleSubmit } = rhf

  const startRound = useStartRound()

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit((data) => {
          startRound.mutate({ data })
        })(event)
      }}
    >
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>trick name</FormLabel>
            <FormDescription>name the first trick in the line</FormDescription>
            <FormControl>
              <Input {...field} placeholder="Kickflip" />
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
            <FormDescription>
              record yourself performing this trick
            </FormDescription>
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
            <Link to="/games/sius">cancel</Link>
          </Button>
        </ButtonGroup>
        <FormSubmitButton busy={startRound.isPending}>
          start round
        </FormSubmitButton>
      </ButtonGroup>
    </Form>
  )
}

export function AddSetForm({ parentSetId }: { parentSetId: number }) {
  const rhf = useForm<z.infer<typeof games.sius.sets.add.schema>>({
    resolver: zodResolver(games.sius.sets.add.schema),
    defaultValues: {
      parentSetId,
    },
  })

  const { control, handleSubmit } = rhf

  const addSet = useAddSet()

  // Get the line of tricks that need to be landed
  const { data: line } = useSuspenseQuery(
    games.sius.sets.line.queryOptions({ setId: parentSetId }),
  )

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit((data) => {
          addSet.mutate({ data })
        })(event)
      }}
    >
      <FormField
        control={control}
        name="parentSetId"
        render={({ field }) => <input type="hidden" {...field} />}
      />

      {line && line.length > 0 && (
        <Alert className="block">
          <TrickLine tricks={line} />
        </Alert>
      )}

      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>new set</FormLabel>
            <FormDescription>
              the name of the new trick you&apos;re adding to the line
            </FormDescription>
            <FormControl>
              <Input {...field} />
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
            <FormDescription>
              record yourself landing all previous tricks in the line in order,
              then landing your new trick at the end
            </FormDescription>
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
            <Link to="/games/sius">cancel</Link>
          </Button>
        </ButtonGroup>
        <FormSubmitButton busy={addSet.isPending}>upload</FormSubmitButton>
      </ButtonGroup>
    </Form>
  )
}
