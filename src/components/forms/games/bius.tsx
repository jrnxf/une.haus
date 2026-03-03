import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { VideoInput } from "~/components/input/video-input"
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
import { useBackUpSet } from "~/lib/games/bius/hooks"

export function BackUpSetForm({ parentSetId }: { parentSetId: number }) {
  const rhf = useForm<z.infer<typeof games.bius.sets.backUp.schema>>({
    resolver: zodResolver(games.bius.sets.backUp.schema),
    defaultValues: {
      parentSetId,
    },
  })

  const { control, handleSubmit } = rhf

  const backUpSet = useBackUpSet()

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit((data) => {
          backUpSet.mutate({ data })
        })(event)
      }}
    >
      <FormField
        control={control}
        name="parentSetId"
        render={({ field }) => <input type="hidden" {...field} />}
      />

      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>new set name</FormLabel>
            <FormDescription>
              name the new set you&apos;re setting (after landing the previous
              one)
            </FormDescription>
            <FormControl>
              <Input {...field} placeholder="360 unispin" />
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
              record landing the previous set and setting a new one
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
            <Link to="/games/bius">cancel</Link>
          </Button>
        </ButtonGroup>
        <FormSubmitButton busy={backUpSet.isPending}>upload</FormSubmitButton>
      </ButtonGroup>
    </Form>
  )
}
